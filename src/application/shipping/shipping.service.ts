export class ShippingService {
  private readonly freeShippingThreshold: number;
  private readonly defaultShippingFee: number;

  constructor() {
    this.freeShippingThreshold = Number(process.env.FREE_SHIPPING_THRESHOLD ?? 50000);
    this.defaultShippingFee = Number(process.env.DEFAULT_SHIPPING_FEE ?? 3000);
  }

  calculateFee(orderAmount: number): number {
    if (orderAmount >= this.freeShippingThreshold) {
      return 0;
    }
    return this.defaultShippingFee;
  }
}
