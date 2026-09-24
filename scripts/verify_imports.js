import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

function getAllJsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllJsFiles(fullPath));
    } else if (file.endsWith('.js') || file.endsWith('.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

const jsFiles = getAllJsFiles(root);
console.log('Total JS/TS files to check imports:', jsFiles.length);

const importRegex = /(?:import|export)\s+(?:[\s\S]*?from\s+)?['"]([^'"]+)['"]/g;
const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

let brokenImports = [];

for (const jsFile of jsFiles) {
  const content = fs.readFileSync(jsFile, 'utf8');
  const relFile = path.relative(root, jsFile);

  const checkSpecifier = (specifier) => {
    // Ignore node builtins and npm packages
    if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
      return;
    }

    const resolved = path.resolve(path.dirname(jsFile), specifier);
    const possiblePaths = [
      resolved,
      resolved + '.js',
      resolved + '.ts',
      resolved + '.json',
      path.join(resolved, 'index.js'),
      path.join(resolved, 'index.ts')
    ];

    const exists = possiblePaths.some(p => fs.existsSync(p));
    if (!exists) {
      brokenImports.push({
        file: relFile,
        specifier
      });
    }
  };

  let match;
  while ((match = importRegex.exec(content)) !== null) {
    checkSpecifier(match[1]);
  }
  while ((match = dynamicImportRegex.exec(content)) !== null) {
    checkSpecifier(match[1]);
  }
}

console.log('Broken imports found:', brokenImports.length);
if (brokenImports.length > 0) {
  console.log(JSON.stringify(brokenImports, null, 2));
}
