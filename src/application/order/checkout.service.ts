import type { PrismaClient, Prisma, PaymentMethod } from '@prisma/client';
import type { PaymentGateway } from '@/domain/payment/gateway';
import { generateOrderNumber } from '@/domain/order/value-objects';
import { InventoryService, type ReservedItem } from '@/application/inventory/inventory.service';
import { CouponService } from '@/application/coupon/coupon.service';
import { ShippingService } from '@/application/shipping/shipping.service';
import { AppError } from '@/lib/errors';

export interface CreateOrderDto {
  addressId: string;
  couponCode?: string;
  paymentMethod: PaymentMethod;
  note?: string;
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  discountAmount: number;
  shippingFee: number;
  finalAmount: number;
  items: {
    productName: string;
    variantInfo: string;
    price: number;
    quantity: number;
    subtotal: number;
  }[];
  payment: {
    id: string;
    method: string;
    status: string;
    pgPaymentId: string | null;
  };
  createdAt: Date;
}

export class CheckoutService {
  private inventoryService: InventoryService;
  private couponService: CouponService;
  private shippingService: ShippingService;

  constructor(
    private prisma: PrismaClient,
    private paymentGateway: PaymentGateway,
  ) {
    this.inventoryService = new InventoryService();
    this.couponService = new CouponService();
    this.shippingService = new ShippingService();
  }

  async createOrder(userId: string, dto: CreateOrderDto): Promise<OrderResponse> {
    return this.prisma.$transaction(
      async (tx) => {
        // 1. Get cart
        const cart = await tx.cart.findUnique({
          where: { userId },
          include: {
            items: {
              include: {
                variant: {
                  include: { product: true },
                },
              },
            },
          },
        });

        if (!cart || cart.items.length === 0) {
          throw new AppError('CART_EMPTY', '장바구니가 비어있습니다.');
        }

        // 2. Reserve stock (SELECT FOR UPDATE)
        const cartItemsForReserve = cart.items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
          variant: {
            product: { id: item.variant.product.id, name: item.variant.product.name },
            size: item.variant.size,
            color: item.variant.color,
            price: item.variant.price,
          },
        }));
        const reservedItems = await this.inventoryService.reserveStock(tx, cartItemsForReserve);

        // 3. Calculate total
        const totalAmount = reservedItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        );

        // 4. Apply coupon
        let discountAmount = 0;
        if (dto.couponCode) {
          discountAmount = await this.couponService.validateAndCalculate(
            tx,
            dto.couponCode,
            userId,
            totalAmount,
          );
        }

        // 5. Calculate shipping
        const shippingFee = this.shippingService.calculateFee(totalAmount - discountAmount);

        // 6. Final amount
        const finalAmount = totalAmount - discountAmount + shippingFee;

        // 7. Snapshot address
        const address = await tx.address.findUnique({
          where: { id: dto.addressId },
        });
        if (!address || address.userId !== userId) {
          throw new AppError('ADDRESS_NOT_FOUND', '배송지를 찾을 수 없습니다.');
        }

        // 8. Create order
        const orderNumber = generateOrderNumber();
        const order = await tx.order.create({
          data: {
            orderNumber,
            userId,
            status: 'PENDING',
            totalAmount,
            discountAmount,
            shippingFee,
            finalAmount,
            addressSnapshot: {
              name: address.name,
              phone: address.phone,
              zipCode: address.zipCode,
              address1: address.address1,
              address2: address.address2,
            },
            couponId: dto.couponCode
              ? (await tx.coupon.findUnique({ where: { code: dto.couponCode } }))?.id
              : undefined,
            note: dto.note,
            items: {
              create: reservedItems.map((item) => ({
                variantId: item.variantId,
                productName: item.productName,
                variantInfo: `${item.size} / ${item.color}`,
                price: item.price,
                quantity: item.quantity,
                subtotal: item.price * item.quantity,
              })),
            },
          },
          include: { items: true },
        });

        // 9. Process payment
        const chargeResult = await this.paymentGateway.charge({
          orderId: order.id,
          orderNumber: order.orderNumber,
          amount: Number(finalAmount),
          method: dto.paymentMethod,
          customerEmail: '',
          customerName: address.name,
          orderName: this.buildOrderName(reservedItems),
        });

        if (!chargeResult.success) {
          await this.inventoryService.releaseStock(tx, reservedItems);
          await tx.order.update({
            where: { id: order.id },
            data: { status: 'CANCELLED' },
          });
          throw new AppError('PAYMENT_FAILED', chargeResult.failReason ?? '결제에 실패했습니다.');
        }

        // 10. Save payment
        const payment = await tx.payment.create({
          data: {
            orderId: order.id,
            method: dto.paymentMethod,
            status: 'COMPLETED',
            amount: finalAmount,
            pgProvider: this.paymentGateway.provider,
            pgPaymentId: chargeResult.paymentId,
            pgResponse: chargeResult.rawResponse as Prisma.InputJsonValue,
            paidAt: chargeResult.paidAt,
          },
        });

        // 11. Update order status to PAID
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'PAID' },
        });

        // 12. Confirm stock reservation
        await this.inventoryService.confirmReservation(tx, reservedItems, order.orderNumber);

        // 13. Mark coupon used
        if (dto.couponCode) {
          await this.couponService.markUsed(tx, dto.couponCode, userId, order.id);
        }

        // 14. Clear cart
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

        // 15. Update sales count
        for (const item of reservedItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: { salesCount: { increment: item.quantity } },
          });
        }

        // 16. Create shipment record
        await tx.shipment.create({
          data: {
            orderId: order.id,
            carrier: '',
            status: 'PREPARING',
          },
        });

        return {
          id: order.id,
          orderNumber: order.orderNumber,
          status: 'PAID',
          totalAmount: Number(totalAmount),
          discountAmount: Number(discountAmount),
          shippingFee: Number(shippingFee),
          finalAmount: Number(finalAmount),
          items: order.items.map((item) => ({
            productName: item.productName,
            variantInfo: item.variantInfo,
            price: Number(item.price),
            quantity: item.quantity,
            subtotal: Number(item.subtotal),
          })),
          payment: {
            id: payment.id,
            method: payment.method,
            status: payment.status,
            pgPaymentId: payment.pgPaymentId,
          },
          createdAt: order.createdAt,
        };
      },
      {
        isolationLevel: 'ReadCommitted',
        timeout: 10000,
      },
    );
  }

  private buildOrderName(items: ReservedItem[]): string {
    if (items.length === 1) return items[0].productName;
    return `${items[0].productName} 외 ${items.length - 1}건`;
  }
}
