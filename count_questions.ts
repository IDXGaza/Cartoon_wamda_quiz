
import { QUESTION_BANK } from "./src/data/localBank";
import { GameMode } from "./src/types";

const buzzerQuestions = QUESTION_BANK[GameMode.BUZZER] || [];
const hexGridQuestions = QUESTION_BANK[GameMode.HEX_GRID] || [];
const trueFalseQuestions = QUESTION_BANK[GameMode.TRUE_FALSE] || [];
const silentGuessQuestions = QUESTION_BANK[GameMode.SILENT_GUESS] || [];

console.log("BUZZER Questions Count:", buzzerQuestions.length);
console.log("TRUE_FALSE Questions Count:", trueFalseQuestions.length);
console.log("SILENT_GUESS Questions Count:", silentGuessQuestions.length);
console.log("HEX_GRID Questions Count:", hexGridQuestions.length);

const letters: Record<string, number> = {};
hexGridQuestions.forEach(q => {
    if (q.letter) {
        letters[q.letter] = (letters[q.letter] || 0) + 1;
    }
});
console.log("HEX_GRID Questions by Letter:", JSON.stringify(letters));
