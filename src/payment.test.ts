import { AgentAuthSDK } from './agent-sdk';
import { PaymentProcessor } from './payment';
import { JsonStorage } from './storage';
import { AgentConfig, PaymentRequest, PaymentStatus } from './models';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DATA_DIR = path.join(__dirname, '..', '.test-data-payment');

function cleanupTestDir(): void {
  if (fs.existsSync(TEST_DATA_DIR)) {
    fs.rmSync(TEST_DATA_DIR, { recursive: true });
  }
}

function createTestProcessor(): PaymentProcessor {
  cleanupTestDir();
  const storage = new JsonStorage(TEST_DATA_DIR);
  const sdk = new AgentAuthSDK('https://sandbox.terminal3.io', storage);
  return new PaymentProcessor(sdk);
}

describe('PaymentProcessor', () => {
  let processor: PaymentProcessor;
  let sdk: AgentAuthSDK;

  beforeEach(() => {
    cleanupTestDir();
    const storage = new JsonStorage(TEST_DATA_DIR);
    sdk = new AgentAuthSDK('https://sandbox.terminal3.io', storage);
    processor = new PaymentProcessor(sdk);
  });

  afterAll(() => {
    cleanupTestDir();
  });

  describe('executePayment', () => {
    it('should execute payment successfully', async () => {
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
        merchant: 'openai.com',
        amount: 20.0,
        currency: 'USD',
        description: 'API usage',
        metadata: { service: 'gpt-4' }
      };

      const result = await processor.executePayment(request);

      expect(result.status).toBe(PaymentStatus.Completed);
      expect(result.paymentId).toMatch(/^pay_/);
      expect(result.txHash).toMatch(/^0x/);
      expect(result.amount).toBe(20.0);
      expect(result.merchant).toBe('openai.com');
    });

    it('should fail for unauthorized agent', async () => {
      const request: PaymentRequest = {
        agentId: 'agent_nonexistent',
        merchant: 'openai.com',
        amount: 20.0,
        currency: 'USD',
        description: 'API usage',
        metadata: {}
      };

      await expect(processor.executePayment(request))
        .rejects.toThrow('Agent not found');
    });

    it('should fail for exceeded daily limit', async () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        description: 'Test agent',
        capabilities: ['payment'],
        authorizationPolicies: [
          { policyType: 'max_daily_amount', value: 10.0 }
        ]
      };

      const credential = await sdk.registerAgent(config);
      const request: PaymentRequest = {
        agentId: credential.agentId,
        merchant: 'openai.com',
        amount: 20.0,
        currency: 'USD',
        description: 'API usage',
        metadata: {}
      };

      await expect(processor.executePayment(request))
        .rejects.toThrow('Authorization denied');
    });

    it('should reject zero amount', async () => {
      const request: PaymentRequest = {
        agentId: 'agent_test',
        merchant: 'openai.com',
        amount: 0,
        currency: 'USD',
        description: 'API usage',
        metadata: {}
      };

      await expect(processor.executePayment(request))
        .rejects.toThrow('Payment amount must be positive');
    });

    it('should reject empty merchant', async () => {
      const request: PaymentRequest = {
        agentId: 'agent_test',
        merchant: '',
        amount: 20.0,
        currency: 'USD',
        description: 'API usage',
        metadata: {}
      };

      await expect(processor.executePayment(request))
        .rejects.toThrow('Merchant is required');
    });
  });
});
