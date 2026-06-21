import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import {
  AuditEntry,
  ComplianceReport,
  PaymentResult
} from './models';

export class AuditLogger {
  private entries: Map<string, AuditEntry[]> = new Map();

  constructor() {
    console.log('📋 Audit Logger initialized');
  }

  logEntry(entry: AuditEntry): void {
    console.log(`📝 Logging audit entry: ${entry.entryId} for agent ${entry.agentId}`);
    
    const agentEntries = this.entries.get(entry.agentId) || [];
    agentEntries.push(entry);
    this.entries.set(entry.agentId, agentEntries);
  }

  getEntries(agentId: string): AuditEntry[] {
    return this.entries.get(agentId) || [];
  }

  generateReport(agentId: string): ComplianceReport {
    const entries = this.getEntries(agentId);
    
    const totalAmount = entries.reduce((sum, entry) => {
      const amount = entry.details.amount || 0;
      return sum + amount;
    }, 0);
    
    return {
      agentId,
      reportId: `report_${uuidv4()}`,
      generatedAt: new Date(),
      totalEntries: entries.length,
      totalAmount,
      entries
    };
  }

  calculateHash(data: any): string {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(data));
    return `0x${hash.digest('hex')}`;
  }

  verifyIntegrity(entry: AuditEntry): boolean {
    const calculatedHash = this.calculateHash(entry.details);
    return calculatedHash === entry.integrityHash;
  }
}