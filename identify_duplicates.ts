import fs from 'fs';
import path from 'path';

const dataDir = './src/data';
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.ts'));

// 1. Load all questions and track seen texts
const seenTexts = new Set<string>();

files.forEach(file => {
    const filePath = path.join(dataDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Find all question objects
    // This assumes the format { id: '...', category: '...', text: '...', ... }
    const regex = /{\s*id:\s*['"]([^'"]+)['"],\s*category:\s*['"][^'"]+['"],\s*text:\s*['"]([^'"]+)['"],[\s\S]*?}/g;
    
    const matches = Array.from(content.matchAll(regex));
    
    for (const match of matches) {
        const id = match[1];
        const text = match[2];
        
        if (seenTexts.has(text)) {
            console.log(`Duplicate: Text "${text}" in ${file} (ID: ${id})`);
        } else {
            seenTexts.add(text);
        }
    }
});
console.log("Cleanup identification finished.");
