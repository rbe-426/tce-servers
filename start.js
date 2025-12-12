#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('[STARTUP] Starting backend server...');

// Fonction pour lancer le serveur
const startServer = () => {
  console.log('[STARTUP] Launching API server (src/server.js)...');
  const server = spawn('node', [path.join(__dirname, 'src', 'server.js')], {
    stdio: 'inherit',
    cwd: __dirname,
  });

  server.on('error', (err) => {
    console.error('[ERROR] Server process error:', err.message);
    process.exit(1);
  });

  server.on('exit', (code, signal) => {
    console.log(`[STARTUP] Server exited with code ${code}, signal ${signal}`);
    if (code !== 0) process.exit(code);
  });
};

// Tenter prisma db push avec timeout 30s
console.log('[STARTUP] Running prisma db push (timeout: 30s)...');
const prismaProcess = spawn('prisma', ['db', 'push', '--skip-generate', '--skip-validate'], {
  cwd: __dirname,
  stdio: 'pipe',
  timeout: 30000,
});

let prismaOutput = '';
let prismaError = '';

prismaProcess.stdout.on('data', (data) => {
  prismaOutput += data.toString();
  console.log(`[PRISMA] ${data.toString().trim()}`);
});

prismaProcess.stderr.on('data', (data) => {
  prismaError += data.toString();
  console.log(`[PRISMA] ${data.toString().trim()}`);
});

prismaProcess.on('close', (code) => {
  if (code === 0) {
    console.log('[STARTUP] ✅ Prisma migration succeeded');
  } else {
    console.warn(`[STARTUP] ⚠️  Prisma migration exited with code ${code}`);
    console.warn('[STARTUP] Continuing with server startup anyway...');
  }
  startServer();
});

prismaProcess.on('error', (err) => {
  console.warn(`[STARTUP] ⚠️  Prisma process error: ${err.message}`);
  console.warn('[STARTUP] Continuing with server startup anyway...');
  startServer();
});

// Timeout: si prisma prend plus de 30s, on lance le serveur quand même
setTimeout(() => {
  if (prismaProcess.exitCode === null) {
    console.warn('[STARTUP] ⚠️  Prisma timeout (30s) - killing process');
    prismaProcess.kill();
    startServer();
  }
}, 30000);

