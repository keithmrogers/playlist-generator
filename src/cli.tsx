import { HealthService } from './services/health-service.js';
const health = new HealthService();
const isHealthy = await health.checkAll();
if (!isHealthy) {
  console.error('Health check failed. Exiting.');
  process.exit(1);
}

// dynamic import = proper ESM load of Ink
import React from 'react';
const { render } = await import('ink');
const { default: App } = await import('./ui/app.js');
render(<App />);

