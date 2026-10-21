#!/usr/bin/env node
/**
 * A stand-in for Google AI, used only by the audit's failure tests (Part 4).
 * POST /__mode {"mode": "error500" | "timeout" | "quota"} picks how every call fails.
 */
import http from 'node:http';

const PORT = Number(process.env.MOCK_PORT) || 8799;
let mode = 'error500';
let calls = 0;

http
  .createServer((req, res) => {
    if (req.url === '/__mode' && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        mode = JSON.parse(body || '{}').mode ?? mode;
        res.end(JSON.stringify({ mode, calls }));
      });
      return;
    }
    if (req.url === '/__calls') return res.end(JSON.stringify({ mode, calls }));
    calls++;
    if (mode === 'timeout') return; // never answers
    res.setHeader('Content-Type', 'application/json');
    if (mode === 'quota') {
      res.statusCode = 429;
      return res.end(JSON.stringify({ error: { message: 'Quota exceeded', details: [{ violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }] }, { retryDelay: '30000s' }] } }));
    }
    res.statusCode = 500;
    res.end(JSON.stringify({ error: { message: 'Internal error (mock)', status: 'INTERNAL' } }));
  })
  .listen(PORT, () => console.log(`mock Google AI on ${PORT}`));
