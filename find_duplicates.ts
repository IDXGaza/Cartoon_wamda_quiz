import fs from 'fs';
import path from 'path';

const dataDir = './src/data';
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.ts'));

interface Question {
  id: string;
  category: string;
  text: string;
  file: string;
}

const allQuestions: Question[] = [];

files.forEach(file => {
  const filePath = path.join(dataDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // This is a rough parser for the exported questions
  // Assuming the structure is an array of objects
  const matches = content.match(/id:\s*['"]([^'"]+)['"],\s*category:\s*['"]([^'"]+)['"],\s*text:\s*['"]([^'"]+)['"]/g);
  
  if (matches) {
    matches.forEach(match => {
        const idMatch = match.match(/id:\s*['"]([^'"]+)['"]/);
        const catMatch = match.match(/category:\s*['"]([^'"]+)['"]/);
        const textMatch = match.match(/text:\s*['"]([^'"]+)['"]/);
        
        if (idMatch && catMatch && textMatch) {
            allQuestions.push({
                id: idMatch[1],
                category: catMatch[1],
                text: textMatch[1],
                file: file
            });
        }
    });
  }
});

const seenTexts = new Set<string>();
const duplicates: Question[] = [];

allQuestions.forEach(q => {
  if (seenTexts.has(q.text)) {
    duplicates.push(q);
  } else {
    seenTexts.add(q.text);
  }
});

console.log(`Found ${duplicates.length} duplicate questions:`);
duplicates.forEach(dup => {
  console.log(`ID: ${dup.id} in ${dup.file} with text: ${dup.text}`);
});
