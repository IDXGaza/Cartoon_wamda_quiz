import * as fs from 'fs';
const buf = fs.readFileSync('src/data/localBank.ts');

try {
  const decoder = new TextDecoder('utf-8', { fatal: true });
  decoder.decode(buf);
  console.log('File is valid UTF-8');
} catch (e) {
  console.log('File is NOT valid UTF-8');
  console.log('Error:', e.message);
  
  // Find where it fails
  for (let i = 1; i <= buf.length; i++) {
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      decoder.decode(buf.slice(0, i));
    } catch (err) {
      console.log(`First invalid byte at index ${i-1}: 0x${buf[i-1].toString(16)}`);
      const lineNum = buf.slice(0, i-1).toString().split('\n').length;
      console.log(`Line number: ${lineNum}`);
      break;
    }
  }
}
