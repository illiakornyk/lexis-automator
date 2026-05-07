import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse .env manually — avoids a runtime dependency on dotenv
const envPath = resolve(__dirname, '../.env');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((line) => line.includes('=') && !line.startsWith('#'))
    .map((line) => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    }),
);

const projectId = env.SUPABASE_PROJECT_ID;
if (!projectId) {
  console.error('SUPABASE_PROJECT_ID is not set in .env');
  process.exit(1);
}

execSync(
  `npx supabase gen types typescript --project-id ${projectId} --schema public > src/database.types.ts`,
  { stdio: 'inherit', cwd: resolve(__dirname, '..') },
);
