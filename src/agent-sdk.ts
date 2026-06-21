import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import {
  AgentConfig,
  AgentCredential,
  AuthorizationPolicy,
  AuthorizationResult,
  AuthorizationStatus,
  PaymentRequest,
  VerificationResult,
  VerificationStatus
} from './models';

export class AgentAuthSDK {
  private endpoint: string;
  private agents: Map<string, AgentCredential> = new Map();

  constructor(endpoint: string) {
    this.endpoint = endpoint;
    console.log(`🔐 Agent Auth SDK initialized with endpoint: ${endpoint}`);
  }

  async registerAgent(config: AgentConfig): Promise<AgentCredential> {
    console.log(`📝 Registering agent: ${config.name}`);
    
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
    
    this.agents.set(agentId, credential);
    
    console.log(`✅ Agent registered: ${agentId}`);
    console.log(`   DID: ${did}`);
    
    return credential;
  }

  async verifyAgent(agentId: string): Promise<VerificationResult> {
    console.log(`🔍 Verifying agent: ${agentId}`);
    
    const credential = this.agents.get(agentId);
    if (!credential) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    
    const result: VerificationResult = {
      agentId,
      status: VerificationStatus.Verified,
      verifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
    
    console.log(`✅ Agent verified: ${agentId}`);
    return result;
  }

  async checkAuthorization(
    agentId: string,
    paymentRequest: PaymentRequest
  ): Promise<AuthorizationResult> {
    console.log(`🔎 Checking authorization for agent: ${agentId}`);
    
    const credential = this.agents.get(agentId);
    if (!credential) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    
    // Check authorization policies
    for (const policy of credential.authorizationPolicies) {
      switch (policy.policyType) {
        case 'max_daily_amount': {
          const maxAmount = policy.value as number;
          if (paymentRequest.amount > maxAmount) {
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
            return {
              agentId,
              status: AuthorizationStatus.Denied,
              policyChecked: policy.policyType,
              reason: `Merchant ${paymentRequest.merchant} not in allowed list`
            };
          }
          break;
        }
      }
    }
    
    // All policies passed
    console.log(`✅ Authorization approved for agent: ${agentId}`);
    return {
      agentId,
      status: AuthorizationStatus.Approved,
      policyChecked: 'all_policies'
    };
  }

  private generatePublicKey(): string {
    const hash = crypto.createHash('sha256');
    hash.update(uuidv4());
    return `0x${hash.digest('hex')}`;
  }
}