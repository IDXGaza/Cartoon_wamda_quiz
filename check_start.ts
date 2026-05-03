import * as fs from 'fs';
const buf = fs.readFileSync('src/data/localBank.ts');
console.log('First 10 bytes:', buf.slice(0, 10));
