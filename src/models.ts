export interface AgentConfig {
  name: string;
  description: string;
  capabilities: string[];
  authorizationPolicies: AuthorizationPolicy[];
}

export type PolicyValue = number | string | string[] | Record<string, unknown>;

export interface AuthorizationPolicy {
  policyType: 'max_daily_amount' | 'allowed_merchants' | 'max_single_amount' | 'time_restriction';
  value: PolicyValue;
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
  metadata: Record<string, unknown>;
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
  details: Record<string, unknown>;
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