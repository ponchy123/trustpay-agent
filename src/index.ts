import { v4 as uuidv4 } from 'uuid';
import { AgentAuthSDK } from './agent-sdk';
import { PaymentProcessor } from './payment';
import { AuditLogger } from './audit';
import {
  AgentConfig,
  PaymentRequest,
  AuditEntry
} from './models';

async function main() {
  console.log('🚀 TrustPay - Privacy-Preserving Agent Payment System');
  console.log('=====================================================');
  
  // Initialize T3 Agent Auth SDK
  const sdk = new AgentAuthSDK('https://sandbox.terminal3.io');
  
  // Initialize payment processor
  const paymentProcessor = new PaymentProcessor(sdk);
  
  // Initialize audit logger
  const auditLogger = new AuditLogger();
  
  // Demo: Agent registration and payment flow
  await demoAgentWorkflow(sdk, paymentProcessor, auditLogger);
}

async function demoAgentWorkflow(
  sdk: AgentAuthSDK,
  paymentProcessor: PaymentProcessor,
  auditLogger: AuditLogger
) {
  console.log('\n📋 Demo: Agent Registration & Payment Flow');
  console.log('-------------------------------------------');
  
  // Step 1: Register a new agent
  console.log('\n1️⃣ Registering new agent...');
  const agentConfig: AgentConfig = {
    name: 'SubscriptionAgent',
    description: 'Automatically manages SaaS subscriptions',
    capabilities: ['payment', 'subscription', 'recurring'],
    authorizationPolicies: [
      {
        policyType: 'max_daily_amount',
        value: 1000.0
      },
      {
        policyType: 'allowed_merchants',
        value: ['openai.com', 'anthropic.com', 'github.com']
      }
    ]
  };
  
  const agentCredential = await sdk.registerAgent(agentConfig);
  console.log(`✅ Agent registered: ${agentCredential.agentId}`);
  console.log(`   DID: ${agentCredential.did}`);
  
  // Step 2: Verify agent identity
  console.log('\n2️⃣ Verifying agent identity...');
  const verificationResult = await sdk.verifyAgent(agentCredential.agentId);
  console.log(`✅ Agent verified: ${verificationResult.status}`);
  
  // Step 3: Check authorization
  console.log('\n3️⃣ Checking payment authorization...');
  const paymentRequest: PaymentRequest = {
    agentId: agentCredential.agentId,
    merchant: 'openai.com',
    amount: 20.0,
    currency: 'USD',
    description: 'API usage payment',
    metadata: {
      service: 'gpt-4',
      tokens_used: 150000
    }
  };
  
  const authResult = await sdk.checkAuthorization(agentCredential.agentId, paymentRequest);
  console.log(`✅ Authorization: ${authResult.status}`);
  
  // Step 4: Execute payment in TEE
  console.log('\n4️⃣ Executing payment in TEE...');
  const paymentResult = await paymentProcessor.executePayment(paymentRequest);
  console.log(`✅ Payment successful: ${paymentResult.paymentId}`);
  console.log(`   Transaction hash: ${paymentResult.txHash}`);
  
  // Step 5: Log audit trail
  console.log('\n5️⃣ Logging audit trail...');
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
  console.log('✅ Audit entry logged with integrity hash');
  
  // Step 6: Generate compliance report
  console.log('\n6️⃣ Generating compliance report...');
  const report = auditLogger.generateReport(agentCredential.agentId);
  console.log(`✅ Report generated: ${report.totalEntries} entries, total amount: $${report.totalAmount.toFixed(2)}`);
  
  console.log('\n🎉 Demo completed successfully!');
  console.log('=====================================================');
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});