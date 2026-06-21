# TrustPay Demo Video Script

## Video Overview

**Title**: TrustPay - Privacy-Preserving Agent Payment System  
**Duration**: 3-4 minutes  
**Audience**: Hackathon judges, potential enterprise users  
**Goal**: Demonstrate core features and highlight Terminal 3 SDK integration

---

## Scene 1: Problem Introduction (0:00 - 0:30)

### Visual
- Split screen showing:
  - Left: Traditional AI agent making payment (red warning icons)
  - Right: TrustPay agent making payment (green security icons)

### Narration
"Enterprise AI agents are revolutionizing business operations, but they face a critical challenge: how to make secure payments without exposing sensitive credentials.

Traditional systems leave payment data vulnerable to interception, lack audit trails, and can't verify agent identities. This creates compliance nightmares for enterprises."

### Key Points
- Payment credential exposure
- No audit trails
- Identity verification gaps
- Compliance challenges

---

## Scene 2: Agent Registration (0:30 - 1:15)

### Visual
- Terminal showing agent registration code
- Animation of credential creation and storage

### Narration
"TrustPay solves this with Terminal 3's Agent Auth SDK. Let me show you how easy it is to register a secure agent.

[Code runs on screen]"

### Demo Code
```typescript
const credential = await sdk.registerAgent({
  name: 'SubscriptionAgent',
  description: 'Manages SaaS subscriptions',
  capabilities: ['payment', 'subscription'],
  authorizationPolicies: [
    { policyType: 'max_daily_amount', value: 1000.0 },
    { policyType: 'allowed_merchants', value: ['openai.com', 'github.com'] }
  ]
});
```

### Key Points
- Agent gets unique DID (Decentralized Identifier)
- Credentials stored in TEE
- Policies configured for fine-grained control

---

## Scene 3: Secure Payment Flow (1:15 - 2:15)

### Visual
- Animated flow showing:
  1. Agent requests payment
  2. Authorization check
  3. TEE execution
  4. Transaction hash

### Narration
"Now let's see TrustPay in action. Our agent needs to pay for API usage.

[Code runs on screen]"

### Demo Code
```typescript
// Agent requests payment
const request = {
  agentId: credential.agentId,
  merchant: 'openai.com',
  amount: 20.0,
  currency: 'USD',
  description: 'API usage'
};

// Execute in TEE
const result = await paymentProcessor.executePayment(request);
console.log(`Payment successful: ${result.paymentId}`);
console.log(`Transaction hash: ${result.txHash}`);
```

### Key Points
- Real-time authorization checks
- TEE-secured execution
- Cryptographic transaction hash
- Payment credentials never exposed

---

## Scene 4: Audit & Compliance (2:15 - 2:45)

### Visual
- Dashboard showing audit entries
- Compliance report generation

### Narration
"Every operation is logged with cryptographic integrity. Let's see the audit trail.

[Shows audit entries]"

### Demo Code
```typescript
// View audit trail
const entries = auditLogger.getEntries(agentId);
console.log(`Total entries: ${entries.length}`);

// Generate compliance report
const report = auditLogger.generateReport(agentId);
console.log(`Total amount: $${report.totalAmount}`);
```

### Key Points
- Immutable audit log
- Integrity hashes for verification
- Automated compliance reports
- Tamper-proof evidence

---

## Scene 5: Technical Deep Dive (2:45 - 3:15)

### Visual
- Architecture diagram
- TEE integration details

### Narration
"Under the hood, TrustPay leverages Terminal 3's TEE infrastructure for maximum security.

[Shows architecture diagram]"

### Key Points
- Hardware-secured enclaves
- Verifiable credentials
- Zero-knowledge proofs
- Real-time policy enforcement

---

## Scene 6: Closing (3:15 - 3:45)

### Visual
- TrustPay logo
- Key benefits listed
- Call to action

### Narration
"TrustPay brings enterprise-grade security to AI agent payments. With Terminal 3's Agent Auth SDK, we're enabling the future of autonomous commerce.

Thank you for watching."

### Key Benefits
- ✅ Secure agent identity
- ✅ Policy-driven authorization
- ✅ Tamper-proof audit
- ✅ Privacy by design

---

## Production Notes

### Screenshots Needed
1. Terminal showing agent registration
2. Payment execution flow
3. Audit dashboard
4. Architecture diagram

### Music
- Upbeat, professional background music
- Low volume during narration
- Slightly louder during transitions

### Graphics
- Clean, modern design
- Terminal 3 brand colors (if available)
- Smooth animations for flow diagrams

### Voiceover
- Clear, professional narration
- Moderate pace
- Emphasis on key security features