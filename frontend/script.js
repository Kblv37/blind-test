// =====================================
// BLINDTEST PRO
// =====================================

const MARKER = "\u2063";

// ─── Backend URL ─────────────────────────────────────────────────────────────
// Change this to your Render URL after deploy, e.g.:
// const API = "https://blindtest-backend.onrender.com";
const API = window.BACKEND_URL || "https://blindtest-backend.onrender.com";

// ─── Keep backend awake (ping every 120 s) ───────────────────────────────────
setInterval(() => {
  fetch(`${API}/ping`).catch(() => {});
}, 120_000);

// =====================================
// ELEMENTS
// =====================================

const input             = document.getElementById("input");
const generateBtn       = document.getElementById("generateBtn");
const inputSection      = document.getElementById("inputSection");
const testSection       = document.getElementById("testSection");
const questionsContainer= document.getElementById("questions");
const checkBtn          = document.getElementById("checkBtn");
const resetBtn          = document.getElementById("resetBtn");
const newTestBtn        = document.getElementById("newTestBtn");
const resultSection     = document.getElementById("resultSection");
const correctCount      = document.getElementById("correctCount");
const wrongCount        = document.getElementById("wrongCount");
const skippedCount      = document.getElementById("skippedCount");
const percentCount      = document.getElementById("percentCount");
const mistakesContainer = document.getElementById("mistakes");
const progressBar       = document.getElementById("progressBar");
const timerElement      = document.getElementById("timer");
const shuffleQuestions  = document.getElementById("shuffleQuestions");
const shuffleAnswers    = document.getElementById("shuffleAnswers");
const questionNav       = document.getElementById("questionNav");

// =====================================
// CLEAR INPUT BUTTON
// =====================================

const clearInputBtn = document.getElementById("clearInputBtn");

function updateClearBtn() {
  clearInputBtn.classList.toggle("hidden", !input.value.trim());
}

input.addEventListener("input", updateClearBtn);
updateClearBtn();

clearInputBtn.addEventListener("click", () => {
  input.value = "";
  localStorage.removeItem("blindtest");
  clearInputBtn.classList.add("hidden");
  input.focus();
});

// =====================================
// COPY PROMPT
// =====================================

const copyPromptBtn  = document.getElementById("copyPromptBtn");
const copyPromptIcon = document.getElementById("copyPromptIcon");
const copyPromptText = document.getElementById("copyPromptText");
const aiPrompt       = document.getElementById("aiPrompt");

copyPromptBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(aiPrompt.textContent.trim());
    copyPromptBtn.classList.add("copied");
    copyPromptIcon.querySelector("use").setAttribute("href", "#icon-check");
    copyPromptText.textContent = "Скопировано";
    setTimeout(() => {
      copyPromptBtn.classList.remove("copied");
      copyPromptIcon.querySelector("use").setAttribute("href", "#icon-copy");
      copyPromptText.textContent = "Скопировать";
    }, 2000);
  } catch {
    const range = document.createRange();
    range.selectNode(aiPrompt);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand("copy");
    window.getSelection().removeAllRanges();
    copyPromptText.textContent = "Скопировано";
    setTimeout(() => { copyPromptText.textContent = "Скопировать"; }, 2000);
  }
});

// =====================================
// UNLOAD GUARD
// =====================================

let testActive = false;

window.addEventListener("beforeunload", (e) => {
  if (testActive) { e.preventDefault(); e.returnValue = ""; }
});

// =====================================
// STORAGE
// =====================================

input.value = localStorage.getItem("blindtest") || "";

input.addEventListener("input", () => {
  localStorage.setItem("blindtest", input.value);
});

// =====================================
// THEME
// =====================================

const themeBtn     = document.getElementById("themeBtn");
const themeBtnIcon = document.getElementById("themeBtnIcon");

themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("light");
  if (document.body.classList.contains("light")) {
    document.documentElement.style.setProperty("--bg",   "#edf2ff");
    document.documentElement.style.setProperty("--text", "#111");
    document.documentElement.style.setProperty("--card", "rgba(255,255,255,0.7)");
    themeBtnIcon.querySelector("use").setAttribute("href", "#icon-sun");
  } else {
    document.documentElement.style.setProperty("--bg",   "#0d111c");
    document.documentElement.style.setProperty("--text", "#fff");
    document.documentElement.style.setProperty("--card", "rgba(255,255,255,0.06)");
    themeBtnIcon.querySelector("use").setAttribute("href", "#icon-moon");
  }
});

// =====================================
// SCROLL TO TOP
// =====================================

const scrollTopBtn = document.getElementById("scrollTopBtn");

window.addEventListener("scroll", () => {
  scrollTopBtn.classList.toggle("visible", window.scrollY > 300);
}, { passive: true });

scrollTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// =====================================
// MOBILE NAV DRAWER
// =====================================

const navToggleBtn      = document.getElementById("navToggleBtn");
const navDrawer         = document.getElementById("navDrawer");
const navDrawerOverlay  = document.getElementById("navDrawerOverlay");
const navDrawerClose    = document.getElementById("navDrawerClose");
const navDrawerGrid     = document.getElementById("navDrawerGrid");
const drawerProgressBar = document.getElementById("drawerProgressBar");

function openDrawer() {
  navDrawer.classList.add("open");
  navDrawerOverlay.style.display = "block";
  requestAnimationFrame(() => navDrawerOverlay.classList.add("open"));
}

function closeDrawer() {
  navDrawer.classList.remove("open");
  navDrawerOverlay.classList.remove("open");
  setTimeout(() => { navDrawerOverlay.style.display = "none"; }, 260);
}

navToggleBtn.addEventListener("click", () => {
  navDrawer.classList.contains("open") ? closeDrawer() : openDrawer();
});
navDrawerClose.addEventListener("click", closeDrawer);
navDrawerOverlay.addEventListener("click", closeDrawer);

// =====================================
// TIMER
// =====================================

let seconds = 0;
let interval;

function startTimer() {
  clearInterval(interval);
  seconds = 0;
  interval = setInterval(() => {
    seconds++;
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    timerElement.textContent = `${m}:${s}`;
  }, 1000);
}

// =====================================
// SHUFFLE
// =====================================

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// =====================================
// LOCAL FALLBACK PARSER
// Handles both multi-line and inline answers:
// "A) Foo B) Bar C) Baz D) Qux"
// =====================================

function splitInlineAnswers(line) {
  // Split on boundaries like " B) " " C) " " D) "
  return line
    .split(/(?=\s[B-D]\)\s?)/)
    .map(s => s.trim())
    .filter(Boolean);
}

function parseQuestionsLocal(text) {
  const rawLines = text.split("\n").map(l => l.trim());
  const lines = [];

  for (const line of rawLines) {
    if (!line) continue;
    // If line starts with an answer option AND has more options inline
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

    // New question: "1." or "1)"
    if (/^\d+[.)]\s/.test(line)) {
      if (current) questions.push(current);
      current = {
        question: line.replace(/^\d+[.)]\s*/, ""),
        answers: []
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

    // Continuation of question text
    if (current) current.question += "\n" + line;
  }

  if (current) questions.push(current);
  return questions;
}

// =====================================
// GENERATE (via backend, fallback local)
// =====================================

let questions = [];

generateBtn.addEventListener("click", async () => {
  const text = input.value.trim();
  if (!text) { alert("Вставь тест"); return; }

  generateBtn.disabled = true;
  generateBtn.style.opacity = "0.7";

  try {
    const res = await fetch(`${API}/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(8000)
    });

    if (res.ok) {
      const data = await res.json();
      questions = data.questions || [];
    } else {
      throw new Error("backend error");
    }
  } catch {
    // Backend unavailable — parse locally
    questions = parseQuestionsLocal(text);
  }

  generateBtn.disabled = false;
  generateBtn.style.opacity = "";

  if (!questions.length) { alert("Не удалось распознать вопросы"); return; }

  if (shuffleQuestions.checked) shuffle(questions);
  if (shuffleAnswers.checked) questions.forEach(q => shuffle(q.answers));

  inputSection.classList.add("hidden");
  testSection.classList.remove("hidden");
  testActive = true;

  renderQuestions();
  createQuestionNav();
  startTimer();
});

// =====================================
// RENDER
// =====================================

function renderQuestions() {
  questionsContainer.innerHTML = "";

  questions.forEach((q, qIndex) => {
    const card = document.createElement("div");
    card.className = "glass question-card";
    card.innerHTML = `
      <div class="question-title">${qIndex + 1}. ${q.question}</div>
      <div class="answers">
        ${q.answers.map((a, aIndex) => `
          <label class="answer">
            <input type="radio" name="q-${qIndex}" value="${aIndex}">
            ${a.text}
          </label>
        `).join("")}
      </div>
    `;
    questionsContainer.appendChild(card);
  });
}

// =====================================
// QUESTION NAV
// =====================================

function createQuestionNav() {
  questionNav.innerHTML = "";
  navDrawerGrid.innerHTML = "";

  questions.forEach((_, index) => {
    const item = document.createElement("div");
    item.className = "nav-item";
    item.textContent = index + 1;
    item.addEventListener("click", () => {
      document.querySelectorAll(".question-card")[index]
        .scrollIntoView({ behavior: "smooth" });
    });
    questionNav.appendChild(item);

    const drawerItem = document.createElement("div");
    drawerItem.className = "nav-item";
    drawerItem.textContent = index + 1;
    drawerItem.addEventListener("click", () => {
      closeDrawer();
      setTimeout(() => {
        document.querySelectorAll(".question-card")[index]
          .scrollIntoView({ behavior: "smooth" });
      }, 280);
    });
    navDrawerGrid.appendChild(drawerItem);
  });
}

// =====================================
// PROGRESS
// =====================================

document.addEventListener("change", updateProgress);

function updateProgress() {
  let answered = 0;
  const navItems       = document.querySelectorAll("#questionNav .nav-item");
  const drawerNavItems = document.querySelectorAll("#navDrawerGrid .nav-item");

  questions.forEach((_, index) => {
    const checked = document.querySelector(`input[name="q-${index}"]:checked`);
    if (checked) {
      answered++;
      navItems[index]?.classList.add("answered");
      drawerNavItems[index]?.classList.add("answered");
    } else {
      navItems[index]?.classList.remove("answered");
      drawerNavItems[index]?.classList.remove("answered");
    }
  });

  const pct = (answered / questions.length) * 100;
  progressBar.style.width = `${pct}%`;
  if (drawerProgressBar) drawerProgressBar.style.width = `${pct}%`;
}

// =====================================
// FULL RESET
// =====================================

function fullReset() {
  clearInterval(interval);
  testActive = false;
  questions = [];
  questionsContainer.innerHTML = "";
  questionNav.innerHTML = "";
  navDrawerGrid.innerHTML = "";
  mistakesContainer.innerHTML = "";
  progressBar.style.width = "0%";
  if (drawerProgressBar) drawerProgressBar.style.width = "0%";
  timerElement.textContent = "00:00";
  testSection.classList.add("hidden");
  resultSection.classList.add("hidden");
  inputSection.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

newTestBtn.addEventListener("click", () => {
  if (!confirm("Вернуться к вводу теста? Все ответы будут потеряны.")) return;
  fullReset();
});

// =====================================
// RESET ANSWERS ONLY
// =====================================

resetBtn.addEventListener("click", () => {
  if (!confirm("Сбросить все ответы?")) return;
  document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
  document.querySelectorAll(".answer").forEach(a => a.classList.remove("correct", "wrong"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("answered"));
  progressBar.style.width = "0%";
  if (drawerProgressBar) drawerProgressBar.style.width = "0%";
  resultSection.classList.add("hidden");
  mistakesContainer.innerHTML = "";
  startTimer();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// =====================================
// CHECK
// =====================================

checkBtn.addEventListener("click", () => {
  clearInterval(interval);
  testActive = false;

  let correct = 0, wrong = 0, skipped = 0;
  mistakesContainer.innerHTML = "";

  questions.forEach((q, qIndex) => {
    const selected = document.querySelector(`input[name="q-${qIndex}"]:checked`);
    const radios   = document.querySelectorAll(`input[name="q-${qIndex}"]`);

    radios.forEach((radio, index) => {
      if (q.answers[index].correct) radio.parentElement.classList.add("correct");
    });

    if (!selected) { skipped++; return; }

    const answerIndex = Number(selected.value);
    if (q.answers[answerIndex].correct) {
      correct++;
    } else {
      wrong++;
      selected.parentElement.classList.add("wrong");
      const correctAnswer = q.answers.find(a => a.correct);
      const div = document.createElement("div");
      div.className = "mistake";
      div.innerHTML = `
        <strong>Вопрос</strong>
        <p>${q.question}</p>
        <strong style="margin-top:8px;display:block;">Правильный ответ</strong>
        <p class="correct-answer-text">${correctAnswer ? correctAnswer.text : "—"}</p>
      `;
      mistakesContainer.appendChild(div);
    }
  });

  const percent = Math.round((correct / questions.length) * 100);
  correctCount.textContent  = correct;
  wrongCount.textContent    = wrong;
  skippedCount.textContent  = skipped;
  percentCount.textContent  = `${percent}%`;

  if (wrong > 0) {
    const title = document.createElement("div");
    title.className = "mistakes-title";
    title.textContent = `Разбор ошибок (${wrong})`;
    mistakesContainer.prepend(title);
  }

  resultSection.classList.remove("hidden");
  resultSection.scrollIntoView({ behavior: "smooth" });
});
