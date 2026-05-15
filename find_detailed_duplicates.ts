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
  
  // Robust regex to extract question object parts
  const matches = content.matchAll(/id:\s*['"]([^'"]+)['"],\s*category:\s*['"]([^'"]+)['"],\s*text:\s*['"]([^'"]+)['"]/g);
  
  for (const match of matches) {
      allQuestions.push({
          id: match[1],
          category: match[2],
          text: match[3],
          file: file
      });
  }
});

const seenTexts = new Map<string, Question[]>();

allQuestions.forEach(q => {
  if (seenTexts.has(q.text)) {
    seenTexts.get(q.text)!.push(q);
  } else {
    seenTexts.set(q.text, [q]);
  }
});

console.log("Duplicate questions found:");
for (const [text, questions] of seenTexts.entries()) {
    if (questions.length > 1) {
        console.log(`\nText: ${text}`);
        questions.forEach(q => console.log(`  - File: ${q.file}, ID: ${q.id}`));
    }
}
