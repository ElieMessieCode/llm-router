import fs from 'fs';
import path from 'path';

function scanDir(dir, patterns) {
  let found = [];
  if (!fs.existsSync(dir)) return found;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found = found.concat(scanDir(fullPath, patterns));
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.html') || entry.name.endsWith('.css') || entry.name.endsWith('.json'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const pattern of patterns) {
        if (content.includes(pattern)) {
          found.push({ file: fullPath, pattern });
        }
      }
    }
  }
  return found;
}

const clientStaticDir = path.resolve(process.cwd(), '.next/static');
const suspiciousPatterns = ['sk-ant-', 'AIzaSy', 'sk-proj-', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'OPENAI_API_KEY', 'SESSION_SECRET'];

const leaks = scanDir(clientStaticDir, suspiciousPatterns);

if (leaks.length > 0) {
  console.error('FAIL: Secret leak detected in client bundle:');
  console.error(JSON.stringify(leaks, null, 2));
  process.exit(1);
} else {
  console.log('PASS: No secret leaks detected in client bundles.');
  process.exit(0);
}
