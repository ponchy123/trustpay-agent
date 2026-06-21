import { AgentAuthSDK } from './agent-sdk';
import { JsonStorage } from './storage';
import { AgentConfig, AuthorizationStatus, PaymentRequest } from './models';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DATA_DIR = path.join(__dirname, '..', '.test-data-sdk');

function cleanupTestDir(): void {
  if (fs.existsSync(TEST_DATA_DIR)) {
    fs.rmSync(TEST_DATA_DIR, { recursive: true });
  }
}

function createTestSDK(): AgentAuthSDK {
  cleanupTestDir();
  const storage = new JsonStorage(TEST_DATA_DIR);
  return new AgentAuthSDK('https://sandbox.terminal3.io', storage);
}

describe('AgentAuthSDK', () => {
  let sdk: AgentAuthSDK;

  beforeEach(() => {
    sdk = createTestSDK();
  });

  afterAll(() => {
    cleanupTestDir();
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

    it('should reject empty name', async () => {
      const config: AgentConfig = {
        name: '',
        description: 'Test agent',
        capabilities: ['payment'],
        authorizationPolicies: []
      };

      await expect(sdk.registerAgent(config))
        .rejects.toThrow('Agent name is required');
    });

    it('should reject empty capabilities', async () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        description: 'Test agent',
        capabilities: [],
        authorizationPolicies: []
      };

      await expect(sdk.registerAgent(config))
        .rejects.toThrow('At least one capability is required');
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

    it('should reject invalid agent ID format', async () => {
      await expect(sdk.verifyAgent('invalid_id'))
        .rejects.toThrow('Invalid agent ID format');
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

    it('should reject zero amount', async () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        description: 'Test agent',
        capabilities: ['payment'],
        authorizationPolicies: []
      };

      const credential = await sdk.registerAgent(config);
      const request: PaymentRequest = {
        agentId: credential.agentId,
        merchant: 'test.com',
        amount: 0,
        currency: 'USD',
        description: 'Test payment',
        metadata: {}
      };

      await expect(sdk.checkAuthorization(credential.agentId, request))
        .rejects.toThrow('Payment amount must be positive');
    });
  });
});
