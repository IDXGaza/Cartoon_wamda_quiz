import * as fs from 'fs';
const content = fs.readFileSync('src/data/localBank.ts');
const text = content.toString('utf8');
const lines = text.split('\n');

console.log('--- Line 576 (Index 575) ---');
const prevLine = lines[575];
console.log('Length:', prevLine.length);
console.log('Last 5 chars:');
for (let i = prevLine.length - 5; i < prevLine.length; i++) {
  console.log(`Char at ${i}: "${prevLine[i]}" (code: ${prevLine.charCodeAt(i)})`);
}

console.log('\n--- Line 577 (Index 576) ---');
const targetLine = lines[576];
console.log('Length:', targetLine.length);
console.log('First 5 chars:');
for (let i = 0; i < 5; i++) {
  console.log(`Char at ${i}: "${targetLine[i]}" (code: ${targetLine.charCodeAt(i)})`);
}
