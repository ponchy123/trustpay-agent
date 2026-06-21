import { AgentAuthSDK } from './agent-sdk';
import { AgentConfig, AuthorizationStatus, PaymentRequest } from './models';

describe('AgentAuthSDK', () => {
  let sdk: AgentAuthSDK;

  beforeEach(() => {
    sdk = new AgentAuthSDK('https://sandbox.terminal3.io');
  });

  describe('registerAgent', () => {
    it('should register a new agent successfully', async () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        description: 'Test agent',
        capabilities: ['payment'],
        authorizationPolicies: [
          { policyType: 'max_daily_amount', value: 100.0 }
        ]
      };

      const credential = await sdk.registerAgent(config);

      expect(credential.agentId).toMatch(/^agent_/);
      expect(credential.did).toMatch(/^did:t3:/);
      expect(credential.capabilities).toContain('payment');
    });

    it('should generate unique agent IDs', async () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        description: 'Test agent',
        capabilities: ['payment'],
        authorizationPolicies: []
      };

      const credential1 = await sdk.registerAgent(config);
      const credential2 = await sdk.registerAgent(config);

      expect(credential1.agentId).not.toBe(credential2.agentId);
    });
  });

  describe('verifyAgent', () => {
    it('should verify a registered agent', async () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        description: 'Test agent',
        capabilities: ['payment'],
        authorizationPolicies: []
      };

      const credential = await sdk.registerAgent(config);
      const result = await sdk.verifyAgent(credential.agentId);

      expect(result.status).toBe('VERIFIED');
      expect(result.agentId).toBe(credential.agentId);
    });

    it('should throw error for non-existent agent', async () => {
      await expect(sdk.verifyAgent('agent_nonexistent'))
        .rejects.toThrow('Agent not found');
    });
  });

  describe('checkAuthorization', () => {
    it('should approve payment within daily limit', async () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        description: 'Test agent',
        capabilities: ['payment'],
        authorizationPolicies: [
          { policyType: 'max_daily_amount', value: 100.0 }
        ]
      };

      const credential = await sdk.registerAgent(config);
      const request: PaymentRequest = {
        agentId: credential.agentId,
        merchant: 'test.com',
        amount: 50.0,
        currency: 'USD',
        description: 'Test payment',
        metadata: {}
      };

      const result = await sdk.checkAuthorization(credential.agentId, request);

      expect(result.status).toBe(AuthorizationStatus.Approved);
    });

    it('should deny payment exceeding daily limit', async () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        description: 'Test agent',
        capabilities: ['payment'],
        authorizationPolicies: [
          { policyType: 'max_daily_amount', value: 100.0 }
        ]
      };

      const credential = await sdk.registerAgent(config);
      const request: PaymentRequest = {
        agentId: credential.agentId,
        merchant: 'test.com',
        amount: 150.0,
        currency: 'USD',
        description: 'Test payment',
        metadata: {}
      };

      const result = await sdk.checkAuthorization(credential.agentId, request);

      expect(result.status).toBe(AuthorizationStatus.Denied);
      expect(result.reason).toContain('exceeds daily limit');
    });

    it('should deny payment to disallowed merchant', async () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        description: 'Test agent',
        capabilities: ['payment'],
        authorizationPolicies: [
          { policyType: 'allowed_merchants', value: ['allowed.com'] }
        ]
      };

      const credential = await sdk.registerAgent(config);
      const request: PaymentRequest = {
        agentId: credential.agentId,
        merchant: 'disallowed.com',
        amount: 50.0,
        currency: 'USD',
        description: 'Test payment',
        metadata: {}
      };

      const result = await sdk.checkAuthorization(credential.agentId, request);

      expect(result.status).toBe(AuthorizationStatus.Denied);
      expect(result.reason).toContain('not in allowed list');
    });
  });
});