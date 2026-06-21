import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import {
  AgentConfig,
  AgentCredential,
  AuthorizationResult,
  AuthorizationStatus,
  PaymentRequest,
  VerificationResult,
  VerificationStatus
} from './models';
import { JsonStorage } from './storage';
import { createLogger, Logger } from './logger';
import { RateLimiter } from './ratelimit';

export class AgentAuthSDK {
  private endpoint: string;
  private storage: JsonStorage;
  private logger: Logger;
  private limiter: RateLimiter;

  constructor(endpoint: string, storage?: JsonStorage) {
    this.endpoint = endpoint;
    this.storage = storage || new JsonStorage();
    this.logger = createLogger('AgentAuthSDK');
    this.limiter = new RateLimiter(100, 60000);
    this.logger.info(`Initialized with endpoint: ${endpoint}`);
  }

  async registerAgent(config: AgentConfig): Promise<AgentCredential> {
    if (!config.name || config.name.trim().length === 0) {
      throw new Error('Agent name is required');
    }

    if (!config.capabilities || config.capabilities.length === 0) {
      throw new Error('At least one capability is required');
    }

    const rateCheck = this.limiter.tryAcquire('register');
    if (!rateCheck.allowed) {
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(rateCheck.resetIn / 1000)}s`);
    }

    this.logger.info(`Registering agent: ${config.name}`);

    const agentId = `agent_${uuidv4()}`;
    const did = `did:t3:${uuidv4()}`;
    const publicKey = this.generatePublicKey();

    const credential: AgentCredential = {
      agentId,
      did,
      publicKey,
      createdAt: new Date(),
      capabilities: config.capabilities,
      authorizationPolicies: config.authorizationPolicies
    };

    this.storage.saveAgent(credential);

    this.logger.info(`Agent registered: ${agentId} (DID: ${did})`);
    return credential;
  }

  async verifyAgent(agentId: string): Promise<VerificationResult> {
    if (!agentId || !agentId.startsWith('agent_')) {
      throw new Error('Invalid agent ID format');
    }

    const rateCheck = this.limiter.tryAcquire('verify');
    if (!rateCheck.allowed) {
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(rateCheck.resetIn / 1000)}s`);
    }

    this.logger.debug(`Verifying agent: ${agentId}`);

    const credential = this.storage.getAgent(agentId);
    if (!credential) {
      this.logger.warn(`Agent not found: ${agentId}`);
      throw new Error(`Agent not found: ${agentId}`);
    }

    const verifiedAt = new Date();
    const expiresAt = new Date(verifiedAt.getTime() + 24 * 60 * 60 * 1000);

    const status = credential.expiredAt && new Date(credential.expiredAt) < verifiedAt
      ? VerificationStatus.Expired
      : VerificationStatus.Verified;

    if (status === VerificationStatus.Expired) {
      this.logger.warn(`Agent expired: ${agentId}`);
    }

    const result: VerificationResult = {
      agentId,
      status,
      verifiedAt,
      expiresAt
    };

    this.logger.info(`Agent verified: ${agentId} (status: ${status})`);
    return result;
  }

  async checkAuthorization(
    agentId: string,
    paymentRequest: PaymentRequest
  ): Promise<AuthorizationResult> {
    if (!agentId || !agentId.startsWith('agent_')) {
      throw new Error('Invalid agent ID format');
    }

    if (paymentRequest.amount <= 0) {
      throw new Error('Payment amount must be positive');
    }

    if (!paymentRequest.merchant || paymentRequest.merchant.trim().length === 0) {
      throw new Error('Merchant is required');
    }

    const rateCheck = this.limiter.tryAcquire('auth');
    if (!rateCheck.allowed) {
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(rateCheck.resetIn / 1000)}s`);
    }

    this.logger.debug(`Checking authorization for agent: ${agentId}`);

    const credential = this.storage.getAgent(agentId);
    if (!credential) {
      this.logger.warn(`Agent not found: ${agentId}`);
      throw new Error(`Agent not found: ${agentId}`);
    }

    for (const policy of credential.authorizationPolicies) {
      switch (policy.policyType) {
        case 'max_daily_amount': {
          const maxAmount = policy.value as number;
          if (paymentRequest.amount > maxAmount) {
            this.logger.warn(`Denied: ${paymentRequest.amount} > daily limit ${maxAmount}`);
            return {
              agentId,
              status: AuthorizationStatus.Denied,
              policyChecked: policy.policyType,
              reason: `Amount ${paymentRequest.amount} exceeds daily limit ${maxAmount}`
            };
          }
          break;
        }
        case 'allowed_merchants': {
          const allowedMerchants = policy.value as string[];
          if (!allowedMerchants.includes(paymentRequest.merchant)) {
            this.logger.warn(`Denied: merchant ${paymentRequest.merchant} not in allowlist`);
            return {
              agentId,
              status: AuthorizationStatus.Denied,
              policyChecked: policy.policyType,
              reason: `Merchant ${paymentRequest.merchant} not in allowed list`
            };
          }
          break;
        }
        case 'max_single_amount': {
          const maxSingle = policy.value as number;
          if (paymentRequest.amount > maxSingle) {
            this.logger.warn(`Denied: ${paymentRequest.amount} > single limit ${maxSingle}`);
            return {
              agentId,
              status: AuthorizationStatus.Denied,
              policyChecked: policy.policyType,
              reason: `Amount ${paymentRequest.amount} exceeds single transaction limit ${maxSingle}`
            };
          }
          break;
        }
        case 'time_restriction': {
          const restriction = policy.value as { allowedHours: [number, number] };
          const now = new Date();
          const currentHour = now.getHours();
          const [startHour, endHour] = restriction.allowedHours;

          if (startHour <= endHour) {
            if (currentHour < startHour || currentHour >= endHour) {
              this.logger.warn(`Denied: current hour ${currentHour} outside allowed range [${startHour}, ${endHour})`);
              return {
                agentId,
                status: AuthorizationStatus.Denied,
                policyChecked: policy.policyType,
                reason: `Current hour ${currentHour} is outside allowed hours [${startHour}, ${endHour})`
              };
            }
          } else {
            if (currentHour < startHour && currentHour >= endHour) {
              this.logger.warn(`Denied: current hour ${currentHour} outside allowed range [${startHour}, ${endHour})`);
              return {
                agentId,
                status: AuthorizationStatus.Denied,
                policyChecked: policy.policyType,
                reason: `Current hour ${currentHour} is outside allowed hours [${startHour}, ${endHour})`
              };
            }
          }
          break;
        }
      }
    }

    this.logger.info(`Authorization approved for agent: ${agentId}`);
    return {
      agentId,
      status: AuthorizationStatus.Approved,
      policyChecked: 'all_policies'
    };
  }

  getStorage(): JsonStorage {
    return this.storage;
  }

  private generatePublicKey(): string {
    const hash = crypto.createHash('sha256');
    hash.update(uuidv4());
    return `0x${hash.digest('hex')}`;
  }
}
