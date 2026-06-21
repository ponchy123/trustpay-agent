import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { AgentAuthSDK } from './agent-sdk';
import {
  PaymentRequest,
  PaymentResult,
  PaymentStatus,
  VerificationStatus
} from './models';
import { createLogger, Logger } from './logger';

export interface PaymentRetryConfig {
  maxRetries: number;
  retryDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: PaymentRetryConfig = {
  maxRetries: 3,
  retryDelayMs: 1000
};

export class PaymentProcessor {
  private sdk: AgentAuthSDK;
  private logger: Logger;
  private retryConfig: PaymentRetryConfig;

  constructor(sdk: AgentAuthSDK, retryConfig?: PaymentRetryConfig) {
    this.sdk = sdk;
    this.logger = createLogger('Payment');
    this.retryConfig = retryConfig || DEFAULT_RETRY_CONFIG;
    this.logger.info(`Initialized (maxRetries: ${this.retryConfig.maxRetries})`);
  }

  async executePayment(request: PaymentRequest): Promise<PaymentResult> {
    if (!request.agentId || !request.agentId.startsWith('agent_')) {
      throw new Error('Invalid agent ID');
    }

    if (request.amount <= 0) {
      throw new Error('Payment amount must be positive');
    }

    if (!request.merchant || request.merchant.trim().length === 0) {
      throw new Error('Merchant is required');
    }

    this.logger.info(`Executing payment: ${request.amount} ${request.currency} to ${request.merchant}`);

    const verification = await this.sdk.verifyAgent(request.agentId);
    if (verification.status !== VerificationStatus.Verified) {
      this.logger.error('Agent verification failed');
      throw new Error('Agent verification failed');
    }

    const authorization = await this.sdk.checkAuthorization(request.agentId, request);
    if (authorization.status !== 'APPROVED') {
      this.logger.error(`Authorization denied: ${authorization.reason}`);
      throw new Error(`Authorization denied: ${authorization.reason}`);
    }

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const result = await this.simulateTEEPayment(request);
        this.logger.info(`Payment executed: ${result.paymentId} (attempt ${attempt}/${this.retryConfig.maxRetries})`);
        return result;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Payment attempt ${attempt} failed: ${lastError.message}`);

        if (attempt < this.retryConfig.maxRetries) {
          this.logger.debug(`Retrying in ${this.retryConfig.retryDelayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.retryConfig.retryDelayMs));
        }
      }
    }

    this.logger.error(`Payment failed after ${this.retryConfig.maxRetries} attempts`);
    throw lastError || new Error('Payment failed after retries');
  }

  async executeBatchPayments(requests: PaymentRequest[]): Promise<PaymentResult[]> {
    this.logger.info(`Executing batch payment: ${requests.length} requests`);
    const results: PaymentResult[] = [];

    for (const request of requests) {
      try {
        const result = await this.executePayment(request);
        results.push(result);
      } catch (error) {
        this.logger.error(`Batch payment failed for ${request.merchant}: ${(error as Error).message}`);
        results.push({
          paymentId: `failed_${uuidv4()}`,
          agentId: request.agentId,
          merchant: request.merchant,
          amount: request.amount,
          currency: request.currency,
          txHash: '',
          executedAt: new Date(),
          status: PaymentStatus.Failed
        });
      }
    }

    this.logger.info(`Batch payment completed: ${results.filter(r => r.status === PaymentStatus.Completed).length}/${requests.length} succeeded`);
    return results;
  }

  private async simulateTEEPayment(request: PaymentRequest): Promise<PaymentResult> {
    const paymentId = `pay_${uuidv4()}`;
    const txHash = this.generateTxHash(request);

    await new Promise(resolve => setTimeout(resolve, 100));

    if (Math.random() < 0.1) {
      throw new Error('TEE network error');
    }

    return {
      paymentId,
      agentId: request.agentId,
      merchant: request.merchant,
      amount: request.amount,
      currency: request.currency,
      txHash,
      executedAt: new Date(),
      status: PaymentStatus.Completed
    };
  }

  private generateTxHash(request: PaymentRequest): string {
    const hash = crypto.createHash('sha256');
    hash.update(request.agentId);
    hash.update(request.merchant);
    hash.update(request.amount.toString());
    hash.update(uuidv4());
    return `0x${hash.digest('hex')}`;
  }

  async refundPayment(paymentId: string, reason: string): Promise<PaymentResult> {
    if (!paymentId || paymentId.trim().length === 0) {
      throw new Error('Payment ID is required');
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error('Refund reason is required');
    }

    this.logger.info(`Refunding payment: ${paymentId}`);

    const txHash = `0x${crypto.createHash('sha256').update(`${paymentId}_${uuidv4()}`).digest('hex')}`;

    const result: PaymentResult = {
      paymentId: `refund_${uuidv4()}`,
      agentId: 'system',
      merchant: 'refund',
      amount: 0,
      currency: 'USD',
      txHash,
      executedAt: new Date(),
      status: PaymentStatus.Refunded
    };

    this.logger.info(`Refund processed: ${result.paymentId} (reason: ${reason})`);
    return result;
  }
}
