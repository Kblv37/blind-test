const express = require("express");
const cors    = require("cors");

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || "https://blindtest.jahongirdev.uz"
}));
app.use(express.json({ limit: "1mb" }));

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

function splitInlineAnswers(line) {
  return line.split(/(?=\s[B-D]\)\s?)/).map(s => s.trim()).filter(Boolean);
}

function parse(text) {
  const rawLines = text.split("\n").map(l => l.trim());
  const lines = [];

  for (const line of rawLines) {
    if (!line) continue;
    if (/^[A-D]\)/.test(line) && /\s[B-D]\)\s?/.test(line)) {
      splitInlineAnswers(line).forEach(l => lines.push(l));
    } else {
      lines.push(line);
    }
  }

  const questions = [];
  let current = null;

  for (const line of lines) {
    if (!line) continue;

    if (/^\d+[.)]\s/.test(line)) {
      if (current) questions.push(current);
      current = { question: line.replace(/^\d+[.)]\s*/, ""), answers: [] };
      continue;
    }

    if (/^[A-D]\)/.test(line)) {
      if (!current) continue;
      const isCorrect = line.includes(MARKER);
      const clean = line.replaceAll(MARKER, "").trim();
      current.answers.push({ text: clean, correct: isCorrect });
      continue;
    }

    if (current) current.question += "\n" + line;
  }

  if (current) questions.push(current);
  return questions;
}

// ─── PARSE + SHUFFLE ─────────────────────────────────────────────────────────
// POST /parse
// Body: { text, shuffleQuestions, shuffleAnswers }
// Returns: { questions }
app.post("/parse", (req, res) => {
  const { text, shuffleQuestions = false, shuffleAnswers = false } = req.body;

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "text required" });
  }

  try {
    let questions = parse(text.trim());

    if (shuffleQuestions) shuffle(questions);
    if (shuffleAnswers)   questions.forEach(q => shuffle(q.answers));

    res.json({ questions });
  } catch {
    res.status(500).json({ error: "parse error" });
  }
});

app.listen(PORT, () => console.log(`Backend on port ${PORT}`));
