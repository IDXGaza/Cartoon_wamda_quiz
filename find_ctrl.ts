import * as fs from 'fs';
const content = fs.readFileSync('src/data/localBank.ts', 'utf8');
for (let i = 0; i < content.length; i++) {
  const code = content.charCodeAt(i);
  if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
    console.log(`Control character found: ${code} at index ${i}`);
  }
}
