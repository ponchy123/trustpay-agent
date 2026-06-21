import * as fs from 'fs';
import * as path from 'path';
import { AgentCredential, AuditEntry } from './models';

interface StorageData {
  agents: Record<string, AgentCredential>;
  auditEntries: Record<string, AuditEntry[]>;
  version: number;
}

export class JsonStorage {
  private filePath: string;
  private data: StorageData;

  constructor(dataDir: string = './data') {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.filePath = path.join(dataDir, 'trustpay.json');
    this.data = this.load();
  }

  private load(): StorageData {
    if (fs.existsSync(this.filePath)) {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as StorageData;
      parsed.agents = Object.fromEntries(
        Object.entries(parsed.agents).map(([k, v]) => [k, { ...v, createdAt: new Date(v.createdAt) }])
      );
      for (const entries of Object.values(parsed.auditEntries)) {
        for (const entry of entries) {
          entry.timestamp = new Date(entry.timestamp);
        }
      }
      return parsed;
    }
    return { agents: {}, auditEntries: {}, version: 1 };
  }

  private save(): void {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  saveAgent(agent: AgentCredential): void {
    this.data.agents[agent.agentId] = agent;
    this.save();
  }

  getAgent(agentId: string): AgentCredential | undefined {
    return this.data.agents[agentId];
  }

  getAllAgents(): AgentCredential[] {
    return Object.values(this.data.agents);
  }

  saveAuditEntry(agentId: string, entry: AuditEntry): void {
    if (!this.data.auditEntries[agentId]) {
      this.data.auditEntries[agentId] = [];
    }
    this.data.auditEntries[agentId].push(entry);
    this.save();
  }

  getAuditEntries(agentId: string): AuditEntry[] {
    return this.data.auditEntries[agentId] || [];
  }

  clear(): void {
    this.data = { agents: {}, auditEntries: {}, version: 1 };
    this.save();
  }
}
