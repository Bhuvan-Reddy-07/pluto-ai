import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const websiteDownloadsDir = path.join(rootDir, 'website', 'downloads');

if (!fs.existsSync(websiteDownloadsDir)) {
  fs.mkdirSync(websiteDownloadsDir, { recursive: true });
}

console.log('📦 Packaging Pluto AI extension bundle for website download...');

// Ensure extension/ mirror is synced with dist/
const distDir = path.join(rootDir, 'dist');
const extensionDir = path.join(rootDir, 'extension');
if (fs.existsSync(distDir)) {
  fs.cpSync(distDir, extensionDir, { recursive: true });
  console.log('✓ Synced dist/ to extension/ for direct developer loading');
}

try {
  // Use PowerShell Compress-Archive on Windows
  const zipPath = path.join(websiteDownloadsDir, 'pluto-ai-v2.0.0.zip');
  const items = ['manifest.json', 'background', 'sidebar', 'content', 'icons', 'options', 'providers', 'shared', 'demo', 'tests', 'dist', 'extension'];
  
  const pathArgs = items
    .filter(i => fs.existsSync(path.join(rootDir, i)))
    .map(i => `'${path.join(rootDir, i)}'`)
    .join(', ');
  const cmd = `Compress-Archive -Path ${pathArgs} -DestinationPath '${zipPath}' -Force`;
  execSync(`powershell -NoProfile -Command "${cmd}"`, { stdio: 'inherit' });
  
  const stats = fs.statSync(zipPath);
  console.log(`✓ Successfully created ${zipPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
} catch (err) {
  console.error('Error packaging extension:', err);
}

