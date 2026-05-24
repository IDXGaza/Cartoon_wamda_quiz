const fs = require('fs');

const text = fs.readFileSync('history_questions.txt', 'utf-8');

const lines = text.split('\n');
const questions = [];
let currentDifficulty = 'beginner';
let currentPoints = 100;
let qText = '';

let idCounter = 1;

const category = "التاريخ";

for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('###')) {
        if (trimmedLine.includes('100')) {
            currentDifficulty = 'beginner';
            currentPoints = 100;
        } else if (trimmedLine.includes('200')) {
            currentDifficulty = 'easy';
            currentPoints = 200;
        } else if (trimmedLine.includes('300')) {
            currentDifficulty = 'medium';
            currentPoints = 300;
        } else if (trimmedLine.includes('400')) {
            currentDifficulty = 'hard';
            currentPoints = 400;
        } else if (trimmedLine.includes('500')) {
            currentDifficulty = 'expert';
            currentPoints = 500;
        }
    } else if (trimmedLine.includes('**سؤال:**')) {
        qText = trimmedLine.split('**سؤال:**')[1].trim();
    } else if (trimmedLine.includes('**جواب:**')) {
        const ansText = trimmedLine.split('**جواب:**')[1].trim();
        let ans = ansText;
        let ansAlt = undefined;

        if (ansText.includes('/')) {
            const parts = ansText.split('/');
            ans = parts[0].trim();
            ansAlt = parts.slice(1).join('/').trim();
        } else if (ansText.includes('(') && ansText.includes(')')) {
             const parts = ansText.split('(');
             ans = parts[0].trim();
             ansAlt = parts[1].replace(')', '').trim();
        }

        questions.push({
            id: `history_${idCounter}`,
            category: category,
            text: qText,
            answer: ans,
            answer_alt: ansAlt,
            difficulty: currentDifficulty,
            points: currentPoints
        });
        idCounter++;
    }
}

let out = "import { BankQuestion } from './localBank';\n\nexport const HISTORY_GEOGRAPHY_QUESTIONS: BankQuestion[] = ";
out += JSON.stringify(questions, null, 2);
out += ";\n";

fs.writeFileSync('src/data/historyGeographyData.ts', out, 'utf-8');
