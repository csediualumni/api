import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SSLCommerzPayment = require('sslcommerz-lts');

export interface SslInitResult {
  gatewayUrl: string;
}

export interface SslValidateResult {
  valid: boolean;
  status: string;
  tranId: string;
  amount: number;
  currency: string;
}

@Injectable()
export class SslCommerzService {
  private readonly logger = new Logger(SslCommerzService.name);

  private readonly storeId: string;
  private readonly storePassword: string;
  private readonly isLive: boolean;

  constructor(private readonly config: ConfigService) {
    this.storeId = this.config.getOrThrow<string>('SSLCOMMERZ_STORE_ID');
    this.storePassword = this.config.getOrThrow<string>('SSLCOMMERZ_STORE_PASSWORD');
    this.isLive = this.config.get<string>('SSLCOMMERZ_IS_LIVE', 'false') === 'true';
  }

  private get sslcz() {
    return new SSLCommerzPayment(this.storeId, this.storePassword, this.isLive);
  }

  private backendUrl(path: string): string {
    const base = this.config.get<string>('BACKEND_URL', 'http://localhost:3000');
    return `${base}/api/v1${path}`;
  }

  async initPayment(params: {
    tranId: string;
    amount: number;
    invoiceId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  }): Promise<SslInitResult> {
    const data = {
      total_amount: params.amount,
      currency: 'BDT',
      tran_id: params.tranId,
      success_url: this.backendUrl(`/invoices/sslcommerz/success?invoiceId=${params.invoiceId}`),
      fail_url: this.backendUrl(`/invoices/sslcommerz/fail?invoiceId=${params.invoiceId}&tranId=${params.tranId}`),
      cancel_url: this.backendUrl(`/invoices/sslcommerz/fail?invoiceId=${params.invoiceId}&tranId=${params.tranId}`),
      ipn_url: this.backendUrl('/invoices/sslcommerz/ipn'),
      cus_name: params.customerName,
      cus_email: params.customerEmail,
      cus_phone: params.customerPhone,
      cus_add1: 'Bangladesh',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      shipping_method: 'NO',
      product_name: 'Invoice Payment',
      product_category: 'Service',
      product_profile: 'non-physical-goods',
    };

    this.logger.log(`[INIT] Initiating SSL Commerz payment tran_id=${params.tranId} amount=${params.amount}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await this.sslcz.init(data);

    if (!response?.GatewayPageURL) {
      this.logger.error(`[INIT] No GatewayPageURL returned: ${JSON.stringify(response)}`);
      throw new Error('SSL Commerz did not return a gateway URL');
    }

    this.logger.log(`[INIT] Got gateway URL for tran_id=${params.tranId}`);
    return { gatewayUrl: response.GatewayPageURL as string };
  }

  async validatePayment(valId: string): Promise<SslValidateResult> {
    this.logger.log(`[VALIDATE] Validating val_id=${valId}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await this.sslcz.validate({ val_id: valId });

    const valid =
      response?.status === 'VALID' || response?.status === 'VALIDATED';

    return {
      valid,
      status: response?.status as string,
      tranId: response?.tran_id as string,
      amount: Number(response?.amount ?? 0),
      currency: (response?.currency_type as string) ?? 'BDT',
    };
  }
}
