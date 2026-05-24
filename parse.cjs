const fs = require('fs');

const difficulty_mapping = {
    500: "hard",
    400: "hard",
    300: "medium",
    200: "medium",
    100: "easy"
};

const questions = [];
let current_points = 100;
let current_question = "";
let current_answer = "";

const content = fs.readFileSync('./cartoon_questions_raw.txt', 'utf-8');
const lines = content.split('\n');

for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    
    if (line.startsWith("### الفئة")) {
        const match = line.match(/(\d+)\s*نقطة/);
        if (match) {
            current_points = parseInt(match[1]);
        }
        continue;
    }
    
    if (line.includes("سؤال:")) {
        if (current_question && current_answer) {
            questions.push({
                id: `car_${questions.length+1}`,
                category: "كرتون",
                text: current_question,
                answer: current_answer,
                difficulty: difficulty_mapping[current_points] || "medium",
                points: current_points,
                tabooWords: current_answer.split(/\s+/).filter(w => w.length > 2)
            });
        }
        let q = line.split("سؤال:")[1].trim();
        q = q.replace(/^[\*\d\.\s]+/, '');
        current_question = q;
        current_answer = "";
    } else if (line.includes("جواب:")) {
        let a = line.split("جواب:")[1].trim();
        a = a.replace(/^[\*\s]+/, '');
        current_answer = a;
    }
}

if (current_question && current_answer) {
    questions.push({
        id: `car_${questions.length+1}`,
        category: "كرتون",
        text: current_question,
        answer: current_answer,
        difficulty: difficulty_mapping[current_points] || "medium",
        points: current_points,
        tabooWords: current_answer.split(/\s+/).filter(w => w.length > 2)
    });
}

let output = "import { BankQuestion, GameMode, QuestionType } from '../types';\n\n";
output += "export const CARTOON_QUESTIONS: BankQuestion[] = [\n";

for (let q of questions) {
    const taboo_str = q.tabooWords.slice(0, 4).map(w => `"${w}"`).join(', ');
    output += `  {
    id: '${q.id}',
    category: '${q.category}',
    text: '${q.text.replace(/'/g, "\\'")}',
    answer: '${q.answer.replace(/'/g, "\\'")}',
    tabooWords: [${taboo_str}],
    difficulty: '${q.difficulty}',
    points: ${q.points}
  },
`;
}
output += "];\n";

fs.writeFileSync('./src/data/cartoonData.ts', output, 'utf-8');
