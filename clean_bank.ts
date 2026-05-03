import * as fs from 'fs';
try {
  const content = fs.readFileSync('src/data/localBank.ts', 'utf8');
  fs.writeFileSync('src/data/localBank.ts', content, 'utf8');
  console.log('File cleaned successfully.');
} catch (e) {
  console.error('Failed to clean file:', e);
}
