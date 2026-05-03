
import * as fs from 'fs';

const filePath = 'src/data/localBank.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Normalize letters in the bank
// 1. Replace 'هـ' (ه + tatweel) with 'ه'
content = content.replace(/letter: 'هـ'/g, "letter: 'ه'");

// 2. Replace Alef variations with 'أ'
// 'ا' (plain), 'إ' (below), 'آ' (madda)
content = content.replace(/letter: '[إاآ]'/g, "letter: 'أ'");

// 3. Replace 'ى' with 'ي' (standard for games usually)
content = content.replace(/letter: 'ى'/g, "letter: 'ي'");

fs.writeFileSync(filePath, content);
console.log('Bank letters normalized.');
