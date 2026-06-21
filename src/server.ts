import express, { Request, Response } from 'express';
import cors from 'cors';
import { AgentAuthSDK } from './agent-sdk';
import { PaymentProcessor } from './payment';
import { AuditLogger } from './audit';
import { JsonStorage } from './storage';
import { createLogger } from './logger';
import { AgentConfig, PaymentRequest, AuditEntry } from './models';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const logger = createLogger('API');
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const storage = new JsonStorage('./data');
const sdk = new AgentAuthSDK('https://sandbox.terminal3.io', storage);
const paymentProcessor = new PaymentProcessor(sdk);
const auditLogger = new AuditLogger(storage);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/agents', async (req: Request, res: Response) => {
  try {
    const config: AgentConfig = req.body;
    const credential = await sdk.registerAgent(config);
    res.status(201).json(credential);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.get('/agents/:agentId', async (req: Request, res: Response) => {
  try {
    const result = await sdk.verifyAgent(req.params.agentId);
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

app.post('/agents/:agentId/authorize', async (req: Request, res: Response) => {
  try {
    const request: PaymentRequest = req.body;
    request.agentId = req.params.agentId;
    const result = await sdk.checkAuthorization(req.params.agentId, request);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.post('/payments', async (req: Request, res: Response) => {
  try {
    const request: PaymentRequest = req.body;
    const result = await paymentProcessor.executePayment(request);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.post('/payments/batch', async (req: Request, res: Response) => {
  try {
    const requests: PaymentRequest[] = req.body.requests;
    const results = await paymentProcessor.executeBatchPayments(requests);
    res.status(201).json({ results });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.post('/payments/:paymentId/refund', async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const result = await paymentProcessor.refundPayment(req.params.paymentId, reason);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.get('/audit/:agentId', (req: Request, res: Response) => {
  try {
    const entries = auditLogger.getEntries(req.params.agentId);
    res.json({ entries });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.get('/audit/:agentId/report', (req: Request, res: Response) => {
  try {
    const report = auditLogger.generateReport(req.params.agentId);
    res.json(report);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export function startServer(): void {
  app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
    logger.info('Endpoints:');
    logger.info('  GET  /health');
    logger.info('  POST /agents');
    logger.info('  GET  /agents/:agentId');
    logger.info('  POST /agents/:agentId/authorize');
    logger.info('  POST /payments');
    logger.info('  POST /payments/batch');
    logger.info('  POST /payments/:paymentId/refund');
    logger.info('  GET  /audit/:agentId');
    logger.info('  GET  /audit/:agentId/report');
  });
}

if (require.main === module) {
  startServer();
}
