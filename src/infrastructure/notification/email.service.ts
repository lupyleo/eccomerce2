export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export interface NotificationService {
  sendEmail(message: EmailMessage): Promise<boolean>;
}

export class EmailNotificationService implements NotificationService {
  async sendEmail(message: EmailMessage): Promise<boolean> {
    // In production, integrate with SMTP (nodemailer) or email service (SendGrid, SES)
    // For now, log the email for development
    console.log('[Email Service] Sending email:', {
      to: message.to,
      subject: message.subject,
      bodyLength: message.html.length,
    });
    return true;
  }
}

export class NotificationServiceFactory {
  private static instance: NotificationService | null = null;

  static create(): NotificationService {
    if (!this.instance) {
      this.instance = new EmailNotificationService();
    }
    return this.instance;
  }
}

// Email templates
export function orderConfirmationEmail(orderNumber: string, totalAmount: number): EmailMessage {
  return {
    to: '',
    subject: `[의류쇼핑몰] 주문이 완료되었습니다 (${orderNumber})`,
    html: `
      <h2>주문 확인</h2>
      <p>주문번호: <strong>${orderNumber}</strong></p>
      <p>결제금액: <strong>${totalAmount.toLocaleString('ko-KR')}원</strong></p>
      <p>주문해 주셔서 감사합니다.</p>
    `,
  };
}

export function shippingNotificationEmail(
  orderNumber: string,
  carrier: string,
  trackingNumber: string,
): EmailMessage {
  return {
    to: '',
    subject: `[의류쇼핑몰] 상품이 배송되었습니다 (${orderNumber})`,
    html: `
      <h2>배송 안내</h2>
      <p>주문번호: <strong>${orderNumber}</strong></p>
      <p>배송사: <strong>${carrier}</strong></p>
      <p>송장번호: <strong>${trackingNumber}</strong></p>
    `,
  };
}

export function passwordResetEmail(resetUrl: string): EmailMessage {
  return {
    to: '',
    subject: '[의류쇼핑몰] 비밀번호 재설정',
    html: `
      <h2>비밀번호 재설정</h2>
      <p>아래 링크를 클릭하여 비밀번호를 재설정하세요.</p>
      <a href="${resetUrl}">비밀번호 재설정</a>
      <p>이 링크는 1시간 후 만료됩니다.</p>
    `,
  };
}
