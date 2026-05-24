import json

# Define difficulties mapping by section points
difficulty_mapping = {
    500: "hard",
    400: "hard",
    300: "medium",
    200: "medium",
    100: "easy"
}

questions = []
current_points = 100

with open('/cartoon_questions_raw.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    
    current_question = ""
    current_answer = ""
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        if line.startswith("### الفئة"):
            import re
            match = re.search(r'(\d+)\s*نقطة', line)
            if match:
                current_points = int(match.group(1))
            continue
            
        if "سؤال:" in line:
            if current_question and current_answer:
                questions.append({
                    "id": f"car_{len(questions)+1}",
                    "category": "كرتون",
                    "text": current_question,
                    "answer": current_answer,
                    "difficulty": difficulty_mapping.get(current_points, "medium"),
                    "points": current_points,
                    "tabooWords": [w for w in current_answer.split() if len(w) > 2]
                })
            # Remove "سؤال:" and any numbers like "1. "
            q = line.split("سؤال:")[1].strip()
            # Clean up leading numbers/asterisks
            q = re.sub(r'^[\*\d\.\s]+', '', q)
            current_question = q
            current_answer = ""
        elif "جواب:" in line:
            a = line.split("جواب:")[1].strip()
            a = re.sub(r'^[\*\s]+', '', a)
            current_answer = a

    if current_question and current_answer:
        questions.append({
            "id": f"car_{len(questions)+1}",
            "category": "كرتون",
            "text": current_question,
            "answer": current_answer,
            "difficulty": difficulty_mapping.get(current_points, "medium"),
            "points": current_points,
            "tabooWords": [w for w in current_answer.split() if len(w) > 2]
        })

output = "import { BankQuestion, GameMode, QuestionType } from '../types';\n\n"
output += "export const CARTOON_QUESTIONS: BankQuestion[] = [\n"

for q in questions:
    taboo_str = ", ".join([f'"{w}"' for w in q["tabooWords"][:4]])
    output += f"""  {{
    id: '{q["id"]}',
    category: '{q["category"]}',
    text: '{q["text"].replace("'", "\\'")}',
    answer: '{q["answer"].replace("'", "\\'")}',
    tabooWords: [{taboo_str}],
    difficulty: '{q["difficulty"]}',
    points: {q["points"]}
  }},
"""
output += "];\n"

with open('/src/data/cartoonData.ts', 'w', encoding='utf-8') as f:
    f.write(output)
