import { AgentAuthSDK } from './agent-sdk';
import { PaymentProcessor } from './payment';
import { AgentConfig, PaymentRequest, PaymentStatus } from './models';

describe('PaymentProcessor', () => {
  let sdk: AgentAuthSDK;
  let processor: PaymentProcessor;

  beforeEach(() => {
    sdk = new AgentAuthSDK('https://sandbox.terminal3.io');
    processor = new PaymentProcessor(sdk);
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
  });
});