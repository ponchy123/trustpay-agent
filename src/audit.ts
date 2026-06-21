import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import {
  AuditEntry,
  ComplianceReport
} from './models';

export class AuditLogger {
  private entries: Map<string, AuditEntry[]> = new Map();

  constructor() {
    console.log('📋 Audit Logger initialized');
  }

  logEntry(entry: AuditEntry): void {
    if (!entry.entryId || entry.entryId.trim().length === 0) {
      throw new Error('Entry ID is required');
    }
    
    if (!entry.agentId || entry.agentId.trim().length === 0) {
      throw new Error('Agent ID is required');
    }
    
    if (!entry.action || entry.action.trim().length === 0) {
      throw new Error('Action is required');
    }
    
    console.log(`📝 Logging audit entry: ${entry.entryId} for agent ${entry.agentId}`);
    
    const agentEntries = this.entries.get(entry.agentId) || [];
    agentEntries.push(entry);
    this.entries.set(entry.agentId, agentEntries);
  }

  getEntries(agentId: string): AuditEntry[] {
    if (!agentId || agentId.trim().length === 0) {
      throw new Error('Agent ID is required');
    }
    
    return this.entries.get(agentId) || [];
  }

  generateReport(agentId: string): ComplianceReport {
    const entries = this.getEntries(agentId);
    
    const totalAmount = entries.reduce((sum, entry) => {
      const amount = (entry.details.amount as number) || 0;
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

  calculateHash(data: Record<string, unknown>): string {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(data));
    return `0x${hash.digest('hex')}`;
  }

  verifyIntegrity(entry: AuditEntry): boolean {
    const calculatedHash = this.calculateHash(entry.details);
    return calculatedHash === entry.integrityHash;
  }
}