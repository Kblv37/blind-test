// ─── CONFIG ──────────────────────────────────────────────────────────────────
const MARKER       = "\u2063";
const API          = "https://blindtest-backend-2cy0.onrender.com";
const PAGE_SIZE    = 5; // вопросов на страницу

// ─── Ping backend every 120s to prevent sleep ────────────────────────────────
setInterval(() => fetch(`${API}/ping`).catch(() => {}), 120_000);

// ─── ELEMENTS ────────────────────────────────────────────────────────────────
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
const clearInputBtn     = document.getElementById("clearInputBtn");
const copyPromptBtn     = document.getElementById("copyPromptBtn");
const copyPromptIcon    = document.getElementById("copyPromptIcon");
const copyPromptText    = document.getElementById("copyPromptText");
const aiPrompt          = document.getElementById("aiPrompt");
const themeBtn          = document.getElementById("themeBtn");
const themeBtnIcon      = document.getElementById("themeBtnIcon");
const scrollTopBtn      = document.getElementById("scrollTopBtn");
const navToggleBtn      = document.getElementById("navToggleBtn");
const navDrawer         = document.getElementById("navDrawer");
const navDrawerOverlay  = document.getElementById("navDrawerOverlay");
const navDrawerClose    = document.getElementById("navDrawerClose");
const navDrawerGrid     = document.getElementById("navDrawerGrid");
const drawerProgressBar = document.getElementById("drawerProgressBar");

// ─── CLEAR INPUT ─────────────────────────────────────────────────────────────
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

// ─── COPY PROMPT ─────────────────────────────────────────────────────────────
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
    const r = document.createRange();
    r.selectNode(aiPrompt);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(r);
    document.execCommand("copy");
    window.getSelection().removeAllRanges();
    copyPromptText.textContent = "Скопировано";
    setTimeout(() => { copyPromptText.textContent = "Скопировать"; }, 2000);
  }
});

// ─── UNLOAD GUARD ────────────────────────────────────────────────────────────
let testActive = false;
window.addEventListener("beforeunload", (e) => {
  if (testActive) { e.preventDefault(); e.returnValue = ""; }
});

// ─── STORAGE ─────────────────────────────────────────────────────────────────
input.value = localStorage.getItem("blindtest") || "";
input.addEventListener("input", () => localStorage.setItem("blindtest", input.value));

// ─── THEME ───────────────────────────────────────────────────────────────────
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

// ─── SCROLL TO TOP ───────────────────────────────────────────────────────────
window.addEventListener("scroll", () => {
  scrollTopBtn.classList.toggle("visible", window.scrollY > 300);
}, { passive: true });
scrollTopBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

// ─── MOBILE DRAWER ───────────────────────────────────────────────────────────
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
navToggleBtn.addEventListener("click", () =>
  navDrawer.classList.contains("open") ? closeDrawer() : openDrawer());
navDrawerClose.addEventListener("click", closeDrawer);
navDrawerOverlay.addEventListener("click", closeDrawer);

// ─── TIMER ───────────────────────────────────────────────────────────────────
let seconds = 0, interval;
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

// ─── SHUFFLE ─────────────────────────────────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── LOCAL FALLBACK PARSER ───────────────────────────────────────────────────
function expandInline(line) {
  // Split "A) foo B) bar C) baz D) qux" into separate lines
  const parts = line.split(/\s+(?=[A-D]\))/);
  return parts.length > 1 ? parts.map(s => s.trim()).filter(Boolean) : [line];
}

function parseLocal(text) {
  const raw = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = [];
  for (const line of raw.split("\n").map(l => l.trim())) {
    if (!line) continue;
    if (/^[A-D]\)/.test(line) && /[A-D]\)/.test(line.slice(2))) {
      expandInline(line).forEach(l => l && lines.push(l));
    } else {
      lines.push(line);
    }
  }

  const questions = [];
  let cur = null;
  for (const line of lines) {
    if (!line) continue;
    if (/^\d+[\s.):]\s*\S/.test(line)) {
      if (cur && cur.answers.length) questions.push(cur);
      cur = { question: line.replace(/^\d+[\s.):]\s*/, "").trim(), answers: [] };
      continue;
    }
    if (/^[A-D][\s.)]\s*\S/.test(line)) {
      if (!cur) continue;
      cur.answers.push({ text: line.replaceAll(MARKER, "").trim(), correct: line.includes(MARKER) });
      continue;
    }
    if (cur && cur.answers.length === 0) cur.question += "\n" + line;
  }
  if (cur && cur.answers.length) questions.push(cur);
  return questions;
}

// ─── SESSION SYNC (Neon DB via backend) ──────────────────────────────────────
let sessionId = null;
let syncTimer = null;

async function createSession() {
  try {
    const res = await fetch(`${API}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: {} }),
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) {
      const data = await res.json();
      sessionId = data.id;
    }
  } catch { /* DB not available, use local only */ }
}

function syncAnswers() {
  if (!sessionId) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    fetch(`${API}/session/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
      signal: AbortSignal.timeout(4000)
    }).catch(() => {});
  }, 1000); // debounce 1s
}

// ─── ANSWERS STORE (persists across pages) ───────────────────────────────────
const answers = {};
let testChecked = false; // true after "Проверить" — locks inputs

function saveAnswer(qIndex, aIndex) {
  answers[qIndex] = aIndex;
  syncAnswers();
}

function getAnswer(qIndex) {
  return answers[qIndex];
}

function clearAnswers() {
  Object.keys(answers).forEach(k => delete answers[k]);
  testChecked = false;
}

// ─── PAGINATION ──────────────────────────────────────────────────────────────
let questions  = [];
let currentPage = 1;

function totalPages() { return Math.ceil(questions.length / PAGE_SIZE); }

function pageQuestions() {
  const start = (currentPage - 1) * PAGE_SIZE;
  return questions.slice(start, start + PAGE_SIZE);
}

function renderPagination() {
  const total = totalPages();
  let el = document.getElementById("pagination");
  if (!el) {
    el = document.createElement("div");
    el.id = "pagination";
    el.className = "pagination";
    testSection.insertBefore(el, document.querySelector(".test-actions"));
  }
  if (total <= 1) { el.innerHTML = ""; return; }

  el.innerHTML = `
    <button class="page-btn" id="prevPage" ${currentPage === 1 ? "disabled" : ""}>
      <svg class="icon"><use href="#icon-arrow-left"/></svg>
    </button>
    <span class="page-info">${currentPage} / ${total}</span>
    <button class="page-btn" id="nextPage" ${currentPage === total ? "disabled" : ""}>
      <svg class="icon" style="transform:rotate(180deg)"><use href="#icon-arrow-left"/></svg>
    </button>
  `;

  document.getElementById("prevPage").addEventListener("click", () => {
    if (currentPage > 1) { currentPage--; renderPage(); }
  });
  document.getElementById("nextPage").addEventListener("click", () => {
    if (currentPage < total) { currentPage++; renderPage(); }
  });
}

function renderPage() {
  questionsContainer.innerHTML = "";
  const pageQ  = pageQuestions();
  const offset = (currentPage - 1) * PAGE_SIZE;

  pageQ.forEach((q, i) => {
    const qIndex = offset + i;
    const card = document.createElement("div");
    card.className = "glass question-card";
    card.dataset.qindex = qIndex;

    card.innerHTML = `
      <div class="question-title">${qIndex + 1}. ${q.question}</div>
      <div class="answers">
        ${q.answers.map((a, aIndex) => `
          <label class="answer">
            <input type="radio" name="q-${qIndex}" value="${aIndex}"
              ${testChecked ? "disabled" : ""}>
            ${a.text}
          </label>
        `).join("")}
      </div>
    `;
    questionsContainer.appendChild(card);

    const saved = getAnswer(qIndex);

    if (testChecked) {
      // After check: show correct/wrong on every answer
      card.querySelectorAll(".answer").forEach((label, aIndex) => {
        if (q.answers[aIndex]?.correct) {
          label.classList.add("correct");
        } else if (aIndex === saved && !q.answers[aIndex]?.correct) {
          label.classList.add("wrong");
        }
        // restore checked state visually
        if (aIndex === saved) {
          label.querySelector("input").checked = true;
        }
      });
    } else {
      // Restore saved answer
      if (saved !== undefined) {
        const radio = card.querySelector(`input[value="${saved}"]`);
        if (radio) radio.checked = true;
      }

      // Save on change
      card.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener("change", () => {
          saveAnswer(Number(radio.name.replace("q-", "")), Number(radio.value));
          updateProgress();
        });
      });
    }
  });

  renderPagination();
  window.scrollTo({ top: 0, behavior: "smooth" });
  updateProgress();
}

// ─── GENERATE ────────────────────────────────────────────────────────────────
generateBtn.addEventListener("click", async () => {
  const text = input.value.trim();
  if (!text) { alert("Вставь тест"); return; }

  generateBtn.disabled = true;
  generateBtn.style.opacity = "0.65";

  try {
    const res = await fetch(`${API}/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        shuffleQuestions: shuffleQuestions.checked,
        shuffleAnswers:   shuffleAnswers.checked
      }),
      signal: AbortSignal.timeout(9000)
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    questions = data.questions || [];
  } catch {
    questions = parseLocal(text);
    if (shuffleQuestions.checked) shuffle(questions);
    if (shuffleAnswers.checked)   questions.forEach(q => shuffle(q.answers));
  }

  generateBtn.disabled = false;
  generateBtn.style.opacity = "";

  if (!questions.length) { alert("Не удалось распознать вопросы"); return; }

  currentPage = 1;
  inputSection.classList.add("hidden");
  testSection.classList.remove("hidden");
  testActive = true;

  createSession(); // start DB session (non-blocking)
  renderPage();
  createQuestionNav();
  startTimer();
});

// ─── QUESTION NAV ────────────────────────────────────────────────────────────
function createQuestionNav() {
  questionNav.innerHTML = "";
  navDrawerGrid.innerHTML = "";

  questions.forEach((_, index) => {
    const make = (onClick) => {
      const el = document.createElement("div");
      el.className = "nav-item";
      el.textContent = index + 1;
      el.addEventListener("click", onClick);
      return el;
    };

    questionNav.appendChild(make(() => {
      const page = Math.floor(index / PAGE_SIZE) + 1;
      if (page !== currentPage) { currentPage = page; renderPage(); }
      setTimeout(() => {
        document.querySelector(`[data-qindex="${index}"]`)
          ?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }));

    navDrawerGrid.appendChild(make(() => {
      closeDrawer();
      const page = Math.floor(index / PAGE_SIZE) + 1;
      if (page !== currentPage) { currentPage = page; renderPage(); }
      setTimeout(() => {
        document.querySelector(`[data-qindex="${index}"]`)
          ?.scrollIntoView({ behavior: "smooth" });
      }, 320);
    }));
  });
}

// ─── PROGRESS ────────────────────────────────────────────────────────────────
document.addEventListener("change", updateProgress);

function updateProgress() {
  let answered = 0;
  const navItems       = document.querySelectorAll("#questionNav .nav-item");
  const drawerNavItems = document.querySelectorAll("#navDrawerGrid .nav-item");

  questions.forEach((_, index) => {
    const hasAnswer = getAnswer(index) !== undefined;
    if (hasAnswer) {
      answered++;
      navItems[index]?.classList.add("answered");
      drawerNavItems[index]?.classList.add("answered");
    } else {
      navItems[index]?.classList.remove("answered");
      drawerNavItems[index]?.classList.remove("answered");
    }
  });

  const pct = questions.length ? (answered / questions.length) * 100 : 0;

  // requestAnimationFrame fixes Android Chrome repaint issue
  requestAnimationFrame(() => {
    progressBar.style.width = `${pct}%`;
    if (drawerProgressBar) drawerProgressBar.style.width = `${pct}%`;
  });
}

// ─── FULL RESET ──────────────────────────────────────────────────────────────
function fullReset() {
  clearInterval(interval);
  testActive = false;
  questions = [];
  currentPage = 1;
  clearAnswers();
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

// ─── RESET ANSWERS ───────────────────────────────────────────────────────────
resetBtn.addEventListener("click", () => {
  if (!confirm("Сбросить все ответы?")) return;
  clearAnswers();
  document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
  document.querySelectorAll(".answer").forEach(a => a.classList.remove("correct", "wrong"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("answered"));
  progressBar.style.width = "0%";
  if (drawerProgressBar) drawerProgressBar.style.width = "0%";
  resultSection.classList.add("hidden");
  mistakesContainer.innerHTML = "";
  currentPage = 1;
  renderPage();
  startTimer();
});

// ─── CHECK ───────────────────────────────────────────────────────────────────
checkBtn.addEventListener("click", () => {
  clearInterval(interval);
  testActive  = false;
  testChecked = true;

  let correct = 0, wrong = 0, skipped = 0;
  mistakesContainer.innerHTML = "";

  questions.forEach((q, qIndex) => {
    const selectedIndex = getAnswer(qIndex);

    if (selectedIndex === undefined) { skipped++; return; }

    if (q.answers[selectedIndex]?.correct) {
      correct++;
    } else {
      wrong++;
      const correctAnswer = q.answers.find(a => a.correct);
      const div = document.createElement("div");
      div.className = "mistake";
      div.innerHTML = `
        <strong>Вопрос ${qIndex + 1}</strong>
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

  // Re-render current page to show correct/wrong highlights and lock inputs
  renderPage();

  resultSection.classList.remove("hidden");
  resultSection.scrollIntoView({ behavior: "smooth" });
});
