#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import net from 'node:net';

const root = resolve(process.env.ARC_REPO_PATH || '../arc-control');
let ok = true;
const line = (pass, message) => { console.log(`${pass ? 'PASS' : 'FAIL'} ${message}`); if (!pass) ok = false; };
const major = Number(process.versions.node.split('.')[0]);
line(Number.isFinite(major) && major >= 22, `Node 22+ required; detected ${process.versions.node}`);
line(existsSync(root), `ARC Control sibling checkout at ${root}`);
for (const file of [
  'apps/control-api/dist/index.js',
  'apps/control-console/dist/index.js',
  'packages/store/dist/index.js',
  'connectors/generic-http/dist/index.js'
]) {
  line(existsSync(join(root, file)), `Compiled ARC module: ${file}`);
}
for (const port of [Number(process.env.MERIDIAN_PORT || 8890), Number(process.env.ARC_SANDBOX_API_PORT || 8787), Number(process.env.ARC_SANDBOX_CONSOLE_PORT || 8788)]) {
  const free = await new Promise(resolveCheck => {
    const srv = net.createServer();
    srv.once('error', () => resolveCheck(false));
    srv.listen(port, '127.0.0.1', () => srv.close(() => resolveCheck(true)));
  });
  line(free, `Port ${port} available on 127.0.0.1`);
}
console.log(ok ? '\nREADY: start the integrated sandbox with npm start' : '\nNOT READY: correct FAIL items before npm start');
process.exitCode = ok ? 0 : 1;
