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

export class PaymentProcessor {
  private sdk: AgentAuthSDK;
  private logger: Logger;

  constructor(sdk: AgentAuthSDK) {
    this.sdk = sdk;
    this.logger = createLogger('Payment');
    this.logger.info('Initialized');
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

    const result = await this.simulateTEEPayment(request);

    this.logger.info(`Payment executed: ${result.paymentId} (tx: ${result.txHash.slice(0, 16)}...)`);
    return result;
  }

  private async simulateTEEPayment(request: PaymentRequest): Promise<PaymentResult> {
    const paymentId = `pay_${uuidv4()}`;
    const txHash = this.generateTxHash(request);

    await new Promise(resolve => setTimeout(resolve, 100));

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
}
