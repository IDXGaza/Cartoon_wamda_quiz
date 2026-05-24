const fs = require('fs');

const text = fs.readFileSync('aot_questions.txt', 'utf-8');

const lines = text.split('\n');
const questions = [];
let currentDifficulty = 'beginner';
let currentPoints = 100;
let qText = '';

let idCounter = 1;

const category = "هجوم العمالقة";

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
    } else if (trimmedLine.includes('سؤال:')) {
        qText = trimmedLine.split('سؤال:')[1].trim();
        // remove ** if present
        if (qText.startsWith('**')) qText = qText.substring(2);
        if (qText.endsWith('**')) qText = qText.substring(0, qText.length - 2);
        qText = qText.trim();
    } else if (trimmedLine.includes('جواب:')) {
        let ansText = trimmedLine.split('جواب:')[1].trim();
        if (ansText.startsWith('**')) ansText = ansText.substring(2);
        if (ansText.endsWith('**')) ansText = ansText.substring(0, ansText.length - 2);
        ansText = ansText.trim();

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
            id: `aot_${idCounter}`,
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

let out = "import { BankQuestion } from './localBank';\n\nexport const AOT_QUESTIONS: BankQuestion[] = ";
out += JSON.stringify(questions, null, 2);
out += ";\n";

fs.writeFileSync('src/data/aotData.ts', out, 'utf-8');
