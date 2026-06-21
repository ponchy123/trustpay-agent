export interface AgentConfig {
  name: string;
  description: string;
  capabilities: string[];
  authorizationPolicies: AuthorizationPolicy[];
}

export interface AuthorizationPolicy {
  policyType: string;
  value: any;
}

export interface AgentCredential {
  agentId: string;
  did: string;
  publicKey: string;
  createdAt: Date;
  capabilities: string[];
  authorizationPolicies: AuthorizationPolicy[];
}

export enum VerificationStatus {
  Verified = 'VERIFIED',
  Expired = 'EXPIRED',
  Revoked = 'REVOKED',
  Invalid = 'INVALID'
}

export interface VerificationResult {
  agentId: string;
  status: VerificationStatus;
  verifiedAt: Date;
  expiresAt: Date;
}

export enum AuthorizationStatus {
  Approved = 'APPROVED',
  Denied = 'DENIED',
  RequiresApproval = 'REQUIRES_APPROVAL'
}

export interface AuthorizationResult {
  agentId: string;
  status: AuthorizationStatus;
  policyChecked: string;
  reason?: string;
}

export interface PaymentRequest {
  agentId: string;
  merchant: string;
  amount: number;
  currency: string;
  description: string;
  metadata: any;
}

export enum PaymentStatus {
  Completed = 'COMPLETED',
  Pending = 'PENDING',
  Failed = 'FAILED',
  Refunded = 'REFUNDED'
}

export interface PaymentResult {
  paymentId: string;
  agentId: string;
  merchant: string;
  amount: number;
  currency: string;
  txHash: string;
  executedAt: Date;
  status: PaymentStatus;
}

export interface AuditEntry {
  entryId: string;
  agentId: string;
  action: string;
  details: any;
  timestamp: Date;
  integrityHash: string;
}

export interface ComplianceReport {
  agentId: string;
  reportId: string;
  generatedAt: Date;
  totalEntries: number;
  totalAmount: number;
  entries: AuditEntry[];
}