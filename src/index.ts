import { v4 as uuidv4 } from 'uuid';
import { AgentAuthSDK } from './agent-sdk';
import { PaymentProcessor } from './payment';
import { AuditLogger } from './audit';
import { JsonStorage } from './storage';
import { createLogger } from './logger';
import {
  AgentConfig,
  PaymentRequest,
  AuditEntry
} from './models';

async function main() {
  const logger = createLogger('Main');
  logger.info('TrustPay - Privacy-Preserving Agent Payment System');
  logger.info('=====================================================');

  // Shared storage instance for data persistence
  const storage = new JsonStorage('./data');

  // Initialize components with shared storage
  const sdk = new AgentAuthSDK('https://sandbox.terminal3.io', storage);
  const paymentProcessor = new PaymentProcessor(sdk);
  const auditLogger = new AuditLogger(storage);

  await demoAgentWorkflow(sdk, paymentProcessor, auditLogger, logger);
}

async function demoAgentWorkflow(
  sdk: AgentAuthSDK,
  paymentProcessor: PaymentProcessor,
  auditLogger: AuditLogger,
  logger: ReturnType<typeof createLogger>
) {
  logger.info('Demo: Agent Registration & Payment Flow');
  logger.info('-------------------------------------------');

  // Step 1: Register a new agent
  logger.info('Step 1: Registering new agent...');
  const agentConfig: AgentConfig = {
    name: 'SubscriptionAgent',
    description: 'Automatically manages SaaS subscriptions',
    capabilities: ['payment', 'subscription', 'recurring'],
    authorizationPolicies: [
      { policyType: 'max_daily_amount', value: 1000.0 },
      { policyType: 'allowed_merchants', value: ['openai.com', 'anthropic.com', 'github.com'] }
    ]
  };

  const agentCredential = await sdk.registerAgent(agentConfig);
  logger.info(`Agent registered: ${agentCredential.agentId}`);
  logger.info(`DID: ${agentCredential.did}`);

  // Step 2: Verify agent identity
  logger.info('Step 2: Verifying agent identity...');
  const verificationResult = await sdk.verifyAgent(agentCredential.agentId);
  logger.info(`Agent verified: ${verificationResult.status}`);

  // Step 3: Check authorization
  logger.info('Step 3: Checking payment authorization...');
  const paymentRequest: PaymentRequest = {
    agentId: agentCredential.agentId,
    merchant: 'openai.com',
    amount: 20.0,
    currency: 'USD',
    description: 'API usage payment',
    metadata: { service: 'gpt-4', tokens_used: 150000 }
  };

  const authResult = await sdk.checkAuthorization(agentCredential.agentId, paymentRequest);
  logger.info(`Authorization: ${authResult.status}`);

  // Step 4: Execute payment in TEE
  logger.info('Step 4: Executing payment in TEE...');
  const paymentResult = await paymentProcessor.executePayment(paymentRequest);
  logger.info(`Payment successful: ${paymentResult.paymentId}`);
  logger.info(`Transaction hash: ${paymentResult.txHash}`);

  // Step 5: Log audit trail
  logger.info('Step 5: Logging audit trail...');
  const auditEntry: AuditEntry = {
    entryId: uuidv4(),
    agentId: agentCredential.agentId,
    action: 'payment_executed',
    details: {
      paymentId: paymentResult.paymentId,
      merchant: paymentResult.merchant,
      amount: paymentResult.amount
    },
    timestamp: new Date(),
    integrityHash: auditLogger.calculateHash({
      paymentId: paymentResult.paymentId,
      merchant: paymentResult.merchant,
      amount: paymentResult.amount
    })
  };

  auditLogger.logEntry(auditEntry);
  logger.info('Audit entry logged with integrity hash');

  // Step 6: Generate compliance report
  logger.info('Step 6: Generating compliance report...');
  const report = auditLogger.generateReport(agentCredential.agentId);
  logger.info(`Report generated: ${report.totalEntries} entries, total amount: $${report.totalAmount.toFixed(2)}`);

  // Step 7: Verify integrity
  logger.info('Step 7: Verifying audit integrity...');
  const integrityValid = auditLogger.verifyIntegrity(auditEntry);
  logger.info(`Integrity check: ${integrityValid ? 'PASSED' : 'FAILED'}`);

  logger.info('Demo completed successfully!');
  logger.info('=====================================================');
}

main().catch((error) => {
  const logger = createLogger('Main');
  logger.error(`Error: ${error.message}`);
  process.exit(1);
});
