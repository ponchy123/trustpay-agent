import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import {
  AuditEntry,
  ComplianceReport
} from './models';
import { JsonStorage } from './storage';
import { createLogger, Logger } from './logger';

export class AuditLogger {
  private storage: JsonStorage;
  private logger: Logger;

  constructor(storage?: JsonStorage) {
    this.storage = storage || new JsonStorage();
    this.logger = createLogger('Audit');
    this.logger.info('Initialized');
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

    this.storage.saveAuditEntry(entry.agentId, entry);
    this.logger.debug(`Logged entry ${entry.entryId} for agent ${entry.agentId}`);
  }

  getEntries(agentId: string): AuditEntry[] {
    if (!agentId || agentId.trim().length === 0) {
      throw new Error('Agent ID is required');
    }

    return this.storage.getAuditEntries(agentId);
  }

  generateReport(agentId: string): ComplianceReport {
    const entries = this.getEntries(agentId);

    const totalAmount = entries.reduce((sum, entry) => {
      const amount = (entry.details.amount as number) || 0;
      return sum + amount;
    }, 0);

    const report: ComplianceReport = {
      agentId,
      reportId: `report_${uuidv4()}`,
      generatedAt: new Date(),
      totalEntries: entries.length,
      totalAmount,
      entries
    };

    this.logger.info(`Report generated for ${agentId}: ${entries.length} entries, $${totalAmount.toFixed(2)}`);
    return report;
  }

  calculateHash(data: Record<string, unknown>): string {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(data));
    return `0x${hash.digest('hex')}`;
  }

  verifyIntegrity(entry: AuditEntry): boolean {
    const calculatedHash = this.calculateHash(entry.details);
    const valid = calculatedHash === entry.integrityHash;
    if (!valid) {
      this.logger.warn(`Integrity check failed for entry ${entry.entryId}`);
    }
    return valid;
  }
}
