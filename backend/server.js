const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ─── HEALTH / PING ───────────────────────────────────────────────────────────
// Render free tier sleeps after inactivity.
// Frontend pings this every 120 s to keep it awake.
app.get("/ping", (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// ─── PARSER ──────────────────────────────────────────────────────────────────
const MARKER = "\u2063"; // invisible unicode marker for correct answer

/**
 * Splits a line that contains multiple answer options written inline.
 * e.g. "A) Foo B) Bar C) Baz D) Qux"  →  ["A) Foo", "B) Bar", "C) Baz", "D) Qux"]
 * Also handles single-line answers normally.
 */
function splitAnswerLine(line) {
  // Split on A) B) C) D) boundaries (with optional space before letter)
  const parts = line
    .split(/(?=\s[A-D]\)\s)/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts : [line];
}

function parseQuestions(text) {
  const rawLines = text.split("\n").map((l) => l.trim());

  // Expand any inline "A) ... B) ... C) ... D) ..." into separate lines
  const lines = [];
  for (const line of rawLines) {
    if (!line) continue;

    // If line starts with a letter option AND contains other options inline
    if (/^[A-D]\)/.test(line) && /\s[B-D]\)\s/.test(line)) {
      splitAnswerLine(line).forEach((l) => lines.push(l));
    } else {
      lines.push(line);
    }
  }

  const questions = [];
  let current = null;

  for (const line of lines) {
    if (!line) continue;

    // New question: starts with digit(s) followed by . or )
    if (/^\d+[.)]\s/.test(line)) {
      if (current) questions.push(current);
      current = {
        question: line.replace(/^\d+[.)]\s*/, ""),
        answers: [],
      };
      continue;
    }

    // Answer option
    if (/^[A-D]\)/.test(line)) {
      if (!current) continue;
      const isCorrect = line.includes(MARKER);
      const clean = line.replaceAll(MARKER, "").trim();
      current.answers.push({ text: clean, correct: isCorrect });
      continue;
    }

    // Extra question text (continuation)
    if (current) {
      current.question += "\n" + line;
    }
  }

  if (current) questions.push(current);
  return questions;
}

// POST /parse  { text: "..." }  →  { questions: [...] }
app.post("/parse", (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "text required" });
  }
  try {
    const questions = parseQuestions(text.trim());
    res.json({ questions });
  } catch (e) {
    res.status(500).json({ error: "parse error" });
  }
});

app.listen(PORT, () => {
  console.log(`BlindTest backend running on port ${PORT}`);
});
