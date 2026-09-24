import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

function getAllFiles(dir, exts = ['.js', '.py', '.json', '.html', '.css', '.ts']) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, exts));
    } else {
      const ext = path.extname(file).toLowerCase();
      if (exts.includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

const files = getAllFiles(root);
console.log('Total files found to audit:', files.length);

const jsErrors = [];
const pyErrors = [];
const jsonErrors = [];

for (const file of files) {
  const ext = path.extname(file).toLowerCase();
  const rel = path.relative(root, file);
  if (ext === '.js') {
    try {
      execSync(`node --check "${file}"`, { stdio: 'pipe' });
    } catch (err) {
      jsErrors.push({ file: rel, error: err.stderr ? err.stderr.toString() : err.message });
    }
  } else if (ext === '.json') {
    try {
      JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
      jsonErrors.push({ file: rel, error: err.message });
    }
  } else if (ext === '.py') {
    try {
      execSync(`python -m py_compile "${file}"`, { stdio: 'pipe' });
    } catch (err) {
      pyErrors.push({ file: rel, error: err.stderr ? err.stderr.toString() : err.message });
    }
  }
}

console.log('=== SYNTAX AUDIT RESULTS ===');
console.log(`JS Files Checked with node --check. Errors: ${jsErrors.length}`);
if (jsErrors.length > 0) {
  console.log('JS Errors:', JSON.stringify(jsErrors, null, 2));
}

console.log(`JSON Files Checked. Errors: ${jsonErrors.length}`);
if (jsonErrors.length > 0) {
  console.log('JSON Errors:', JSON.stringify(jsonErrors, null, 2));
}

console.log(`Python Files Checked with py_compile. Errors: ${pyErrors.length}`);
if (pyErrors.length > 0) {
  console.log('Python Errors:', JSON.stringify(pyErrors, null, 2));
}
