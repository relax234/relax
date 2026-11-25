import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDist = path.resolve(__dirname, '..', 'dist');
const targetDist = path.resolve(__dirname, 'web-dist');

if (!fs.existsSync(rootDist)) {
  console.error('Missing ../dist folder. Run "npm run build" in project root first.');
  process.exit(1);
}

fs.rmSync(targetDist, { recursive: true, force: true });
fs.cpSync(rootDist, targetDist, { recursive: true, force: true });
console.log(`Copied Vite bundle to ${targetDist}`);
