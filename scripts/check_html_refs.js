import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

function getAllHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllHtmlFiles(fullPath));
    } else if (file.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

const htmlFiles = getAllHtmlFiles(root);
console.log('Auditing HTML files:', htmlFiles.length);

let brokenRefs = [];

const srcRegex = /(?:src|href)=["']([^"']+)["']/g;

for (const htmlFile of htmlFiles) {
  const content = fs.readFileSync(htmlFile, 'utf8');
  let match;
  while ((match = srcRegex.exec(content)) !== null) {
    const ref = match[1];
    if (ref.startsWith('http://') || ref.startsWith('https://') || ref.startsWith('//') || ref.startsWith('#') || ref.startsWith('data:') || ref.startsWith('javascript:')) {
      continue;
    }
    // Remove query params or hashes
    const cleanRef = ref.split('?')[0].split('#')[0];
    if (!cleanRef) continue;

    // Resolve relative to html file directory and relative to project root
    const relToHtml = path.resolve(path.dirname(htmlFile), cleanRef);
    const relToRoot = path.resolve(root, cleanRef.startsWith('/') ? cleanRef.slice(1) : cleanRef);

    if (!fs.existsSync(relToHtml) && !fs.existsSync(relToRoot)) {
      brokenRefs.push({
        htmlFile: path.relative(root, htmlFile),
        reference: ref
      });
    }
  }
}

console.log('Broken HTML references found:', brokenRefs.length);
if (brokenRefs.length > 0) {
  console.log(JSON.stringify(brokenRefs, null, 2));
}
