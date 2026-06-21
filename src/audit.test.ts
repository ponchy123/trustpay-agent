import { AuditLogger } from './audit';
import { JsonStorage } from './storage';
import { AuditEntry } from './models';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DATA_DIR = path.join(__dirname, '..', '.test-data');

function cleanupTestDir(): void {
  if (fs.existsSync(TEST_DATA_DIR)) {
    fs.rmSync(TEST_DATA_DIR, { recursive: true });
  }
}

function createTestStorage(): JsonStorage {
  cleanupTestDir();
  return new JsonStorage(TEST_DATA_DIR);
}

describe('AuditLogger', () => {
  let logger: AuditLogger;

  beforeEach(() => {
    const storage = createTestStorage();
    logger = new AuditLogger(storage);
  });

  afterAll(() => {
    cleanupTestDir();
  });

  describe('logEntry', () => {
    it('should log an audit entry', () => {
      const entry: AuditEntry = {
        entryId: 'test-entry-1',
        agentId: 'agent-1',
        action: 'payment_executed',
        details: { paymentId: 'pay-1', amount: 100.0 },
        timestamp: new Date(),
        integrityHash: '0xabc'
      };

      logger.logEntry(entry);
      const entries = logger.getEntries('agent-1');

      expect(entries).toHaveLength(1);
      expect(entries[0].entryId).toBe('test-entry-1');
    });

    it('should log multiple entries for same agent', () => {
      const entry1: AuditEntry = {
        entryId: 'test-entry-1',
        agentId: 'agent-1',
        action: 'payment_executed',
        details: { paymentId: 'pay-1', amount: 100.0 },
        timestamp: new Date(),
        integrityHash: '0xabc'
      };

      const entry2: AuditEntry = {
        entryId: 'test-entry-2',
        agentId: 'agent-1',
        action: 'payment_executed',
        details: { paymentId: 'pay-2', amount: 200.0 },
        timestamp: new Date(),
        integrityHash: '0xdef'
      };

      logger.logEntry(entry1);
      logger.logEntry(entry2);
      const entries = logger.getEntries('agent-1');

      expect(entries).toHaveLength(2);
    });
  });

  describe('getEntries', () => {
    it('should return empty array for unknown agent', () => {
      const entries = logger.getEntries('agent-unknown');
      expect(entries).toHaveLength(0);
    });
  });

  describe('generateReport', () => {
    it('should generate compliance report', () => {
      const entry: AuditEntry = {
        entryId: 'test-entry-1',
        agentId: 'agent-1',
        action: 'payment_executed',
        details: { paymentId: 'pay-1', amount: 100.0 },
        timestamp: new Date(),
        integrityHash: '0xabc'
      };

      logger.logEntry(entry);
      const report = logger.generateReport('agent-1');

      expect(report.agentId).toBe('agent-1');
      expect(report.totalEntries).toBe(1);
      expect(report.totalAmount).toBe(100.0);
      expect(report.entries).toHaveLength(1);
    });

    it('should aggregate amounts correctly', () => {
      const entry1: AuditEntry = {
        entryId: 'test-entry-1',
        agentId: 'agent-1',
        action: 'payment_executed',
        details: { paymentId: 'pay-1', amount: 50.0 },
        timestamp: new Date(),
        integrityHash: '0xabc'
      };

      const entry2: AuditEntry = {
        entryId: 'test-entry-2',
        agentId: 'agent-1',
        action: 'payment_executed',
        details: { paymentId: 'pay-2', amount: 75.0 },
        timestamp: new Date(),
        integrityHash: '0xdef'
      };

      logger.logEntry(entry1);
      logger.logEntry(entry2);
      const report = logger.generateReport('agent-1');

      expect(report.totalAmount).toBe(125.0);
    });
  });

  describe('calculateHash', () => {
    it('should generate consistent hash', () => {
      const data = { paymentId: 'pay-1', amount: 100.0 };
      const hash1 = logger.calculateHash(data);
      const hash2 = logger.calculateHash(data);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^0x/);
    });

    it('should generate different hashes for different data', () => {
      const data1 = { paymentId: 'pay-1', amount: 100.0 };
      const data2 = { paymentId: 'pay-2', amount: 200.0 };

      const hash1 = logger.calculateHash(data1);
      const hash2 = logger.calculateHash(data2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyIntegrity', () => {
    it('should verify valid integrity hash', () => {
      const details = { paymentId: 'pay-1', amount: 100.0 };
      const integrityHash = logger.calculateHash(details);

      const entry: AuditEntry = {
        entryId: 'test-entry-1',
        agentId: 'agent-1',
        action: 'payment_executed',
        details,
        timestamp: new Date(),
        integrityHash
      };

      expect(logger.verifyIntegrity(entry)).toBe(true);
    });

    it('should detect tampered data', () => {
      const details = { paymentId: 'pay-1', amount: 100.0 };
      const integrityHash = logger.calculateHash(details);

      const entry: AuditEntry = {
        entryId: 'test-entry-1',
        agentId: 'agent-1',
        action: 'payment_executed',
        details: { paymentId: 'pay-1', amount: 200.0 },
        timestamp: new Date(),
        integrityHash
      };

      expect(logger.verifyIntegrity(entry)).toBe(false);
    });
  });
});
