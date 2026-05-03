
import * as fs from 'fs';
const content = fs.readFileSync('src/data/localBank.ts', 'utf8');
const alphabet = "أبتثجحخدذرزسشصضطظعغفقكلمنهوي";

console.log('Alphabet letter "ه" code:', alphabet[alphabet.indexOf('ه')].charCodeAt(0));

const match = content.match(/letter: '(.*?)'/g);
const letters = match ? match.map(m => m.match(/'(.*?)'/)[1]) : [];
const uniqueLetters = Array.from(new Set(letters));

console.log('Unique letters in bank:', uniqueLetters);
uniqueLetters.forEach(l => {
    if (l.startsWith('ه')) {
        console.log(`Letter starting with 'ه' in bank: "${l}", codes:`, l.split('').map(c => c.charCodeAt(0)));
    }
});
