import * as fs from 'fs';
const buf = fs.readFileSync('src/data/localBank.ts');
const target = Buffer.from('tf_v2_62');
const index = buf.indexOf(target);
if (index === -1) {
  console.log('Not found');
} else {
  console.log('Found "tf_v2_62" at index:', index);
  console.log('Bytes around it:');
  const start = Math.max(0, index - 20);
  const end = Math.min(buf.length, index + 30);
  console.log(buf.slice(start, end));
  console.log(buf.slice(start, end).toString('utf8'));
}
