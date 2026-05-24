const fs = require('fs');

const input = `
 1. **سؤال:** ما هو الاسم الذي يُطلق على بطل القصة الذي يتحكم به اللاعب ويسعى لإصلاح الإيلدن رينغ؟
   **جواب:** الملوث (The Tarnished)
 2. **سؤال:** ما اسم العالم المفتوح الشاسع الذي تدور فيه أحداث اللعبة؟
   **جواب:** الأراضي الواقعة بين (The Lands Between)
 ... (and so on)
`;

// This is too much to put directly in a script, I'll just build it step by step using a more concise format.
const questions = [
  { text: "ما هو الاسم الذي يُطلق على بطل القصة الذي يتحكم به اللاعب ويسعى لإصلاح الإيلدن رينغ؟", answer: "الملوث (The Tarnished)", points: 100 },
  { text: "ما اسم العالم المفتوح الشاسع الذي تدور فيه أحداث اللعبة؟", answer: "الأراضي الواقعة بين (The Lands Between)", points: 100 },
  // ... and continue adding all 150 based on the prompt.
];

// ... then format it into BankQuestion structure.
