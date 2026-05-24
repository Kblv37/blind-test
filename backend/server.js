const express = require("express");
const cors    = require("cors");

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json({ limit: "2mb" }));

// ─── PING ────────────────────────────────────────────────────────────────────
app.get("/ping", (_req, res) => res.json({ ok: true }));

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const MARKER = "\u2063";

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Принудительно разбивает строку с инлайн-ответами.
 * Поддерживает все варианты:
 *   "A) Foo B) Bar C) Baz D) Qux"
 *   "A) Foo⁣ B) Bar C) Baz D) Qux"  (с маркером внутри)
 *   "A)Foo B)Bar"  (без пробела после скобки)
 */
function expandInlineAnswers(line) {
  // Разбиваем перед каждым [A-D]) которому предшествует не начало строки
  const parts = line.split(/(?<!\A)(?=[A-D]\))/);
  if (parts.length > 1) return parts.map(s => s.trim()).filter(Boolean);
  // Второй вариант: разбиваем по пробелу перед [A-D])
  const parts2 = line.split(/\s+(?=[A-D]\))/);
  if (parts2.length > 1) return parts2.map(s => s.trim()).filter(Boolean);
  return [line];
}

function parse(rawText) {
  // Нормализуем переносы строк и убираем \r
  const text = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rawLines = text.split("\n").map(l => l.trim());
  const lines = [];

  for (const line of rawLines) {
    if (!line) continue;

    // Если строка содержит несколько вариантов ответа — разбиваем
    // Признак: начинается с [A-D]) И содержит ещё один [A-D]) дальше
    if (/^[A-D]\)/.test(line) && /[A-D]\)/.test(line.slice(2))) {
      expandInlineAnswers(line).forEach(l => { if (l) lines.push(l); });
    } else {
      lines.push(line);
    }
  }

  const questions = [];
  let current = null;

  for (const line of lines) {
    if (!line) continue;

    // Новый вопрос: "1." или "1)" или "1 ."
    if (/^\d+[\s.):]\s*\S/.test(line)) {
      if (current && current.answers.length) questions.push(current);
      current = {
        question: line.replace(/^\d+[\s.):]\s*/, "").trim(),
        answers: []
      };
      continue;
    }

    // Вариант ответа: A) B) C) D)
    if (/^[A-D][\s.)]\s*\S/.test(line)) {
      if (!current) continue;
      const isCorrect = line.includes(MARKER);
      const clean = line.replaceAll(MARKER, "").trim();
      current.answers.push({ text: clean, correct: isCorrect });
      continue;
    }

    // Продолжение текста вопроса
    if (current && current.answers.length === 0) {
      current.question += "\n" + line;
    }
  }

  if (current && current.answers.length) questions.push(current);
  return questions;
}

// ─── POST /parse ─────────────────────────────────────────────────────────────
app.post("/parse", (req, res) => {
  const { text, shuffleQuestions = false, shuffleAnswers = false } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "text required" });
  }
  try {
    let questions = parse(text);
    if (shuffleQuestions) shuffle(questions);
    if (shuffleAnswers)   questions.forEach(q => shuffle(q.answers));
    res.json({ questions });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "parse error" });
  }
});

app.listen(PORT, () => console.log(`Backend on port ${PORT}`));
