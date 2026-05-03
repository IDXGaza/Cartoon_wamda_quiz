import * as fs from 'fs';
const buf = fs.readFileSync('src/data/localBank.ts');
const target = Buffer.from([0xef, 0xbf, 0xbd]);
let count = 0;
let pos = buf.indexOf(target);
while (pos !== -1) {
  count++;
  console.log(`Found replacement character at index ${pos}`);
  // Find which line it is
  const lineNum = buf.slice(0, pos).toString().split('\n').length;
  console.log(`Likely line number: ${lineNum}`);
  pos = buf.indexOf(target, pos + 1);
}
console.log(`Total found: ${count}`);
