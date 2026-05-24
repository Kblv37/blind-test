const express = require("express");
const cors    = require("cors");
const { Pool } = require("pg");

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json({ limit: "2mb" }));

// ─── NEON DB ──────────────────────────────────────────────────────────────────
let pool = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  // Create table + auto-delete after 24h
  pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id        TEXT PRIMARY KEY,
      answers   JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `).catch(e => console.error("DB init error:", e));

  // Cleanup old sessions every hour
  setInterval(() => {
    pool.query("DELETE FROM sessions WHERE created_at < NOW() - INTERVAL '24 hours'")
      .catch(() => {});
  }, 60 * 60 * 1000);
}

// ─── PING ─────────────────────────────────────────────────────────────────────
app.get("/ping", (_req, res) => res.json({ ok: true }));

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const MARKER = "\u2063";

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function expandInline(line) {
  // Split on A) B) C) D) boundaries — with or without preceding space
  // Also handles MARKER (U+2063) glued right before the letter: "текст⁠B)"
  const parts = line
    .split(/(?<=[^\s])(?=[A-D]\))|(?<=\s)(?=[A-D]\))/)
    .map(s => s.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts : [line];
}

function parse(rawText) {
  const text = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Pre-process: insert newline before every A) B) C) D) and "Объяснение:"
  // This handles cases where everything is on one line (mobile ChatGPT copy)
  const normalized = text
    .replace(/([^\n])([A-D]\))/g, "$1\n$2")          // split before A) B) C) D)
    .replace(/([^\n])(Объяснение\s*:)/gi, "$1\n$2");  // split before Объяснение:

  const lines = normalized
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  const questions = [];
  let cur = null;

  for (const line of lines) {
    if (!line) continue;

    // New question: starts with digit
    if (/^\d+[\s.):]\s*\S/.test(line)) {
      if (cur && cur.answers.length) questions.push(cur);
      cur = { question: line.replace(/^\d+[\s.):]\s*/, "").trim(), answers: [], explanation: "" };
      continue;
    }

    // Answer option
    if (/^[A-D][\s.)]\s*\S/.test(line)) {
      if (!cur) continue;
      const isCorrect = line.includes(MARKER);
      const clean = line
        .replaceAll(MARKER, "")
        .replace(/^[A-D][\s.)]+\s*/, "")
        .trim();
      cur.answers.push({ text: clean, correct: isCorrect });
      continue;
    }

    // Explanation line
    if (cur && /^Объяснение\s*:/i.test(line)) {
      cur.explanation = line.replace(/^Объяснение\s*:\s*/i, "").trim();
      continue;
    }

    // Continuation of question text (before any answers)
    if (cur && cur.answers.length === 0) cur.question += "\n" + line;
  }

  if (cur && cur.answers.length) questions.push(cur);
  return questions;
}

// ─── POST /parse ──────────────────────────────────────────────────────────────
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

// ─── SESSION ROUTES (only if DB connected) ────────────────────────────────────

// POST /session  →  { id }   create new session
app.post("/session", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "DB not configured" });
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  try {
    await pool.query(
      "INSERT INTO sessions (id, answers) VALUES ($1, $2)",
      [id, JSON.stringify(req.body.answers || {})]
    );
    res.json({ id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db error" });
  }
});

// PATCH /session/:id  →  save answers  { answers: { "0": 2, "3": 1, ... } }
app.patch("/session/:id", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "DB not configured" });
  try {
    await pool.query(
      "UPDATE sessions SET answers = $1 WHERE id = $2",
      [JSON.stringify(req.body.answers || {}), req.params.id]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db error" });
  }
});

// GET /session/:id  →  { answers }
app.get("/session/:id", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "DB not configured" });
  try {
    const result = await pool.query(
      "SELECT answers FROM sessions WHERE id = $1 AND created_at > NOW() - INTERVAL '24 hours'",
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "not found" });
    res.json({ answers: result.rows[0].answers });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "db error" });
  }
});

app.listen(PORT, () => console.log(`Backend on port ${PORT}`));
