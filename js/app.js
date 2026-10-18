
"use strict";

const DATA_PATH = "data/";
const STORAGE_KEY = "neurolearn_progress_v2";

const chapters = [
  { file: "01_stroke.json", title: "بیماری‌های عروق مغزی و سکته" },
  { file: "02_epilepsy.json", title: "صرع و اختلالات تشنجی" },
  { file: "03_headache.json", title: "سردرد" },
  { file: "04_dementia.json", title: "دمانس و اختلالات حافظه" },
  { file: "05_coma.json", title: "کما" },
  { file: "06_demyelination.json", title: "ام‌اس و بیماری‌های دمیلینه‌کننده" },
  { file: "07_neuroinfection.json", title: "عفونت‌های سیستم عصبی" },
  { file: "08_viral_prion.json", title: "عفونت‌های ویروسی و پریونی" },
  { file: "09_degenerative.json", title: "بیماری‌های دژنراتیو" },
  { file: "10_sleep.json", title: "اختلالات خواب" }
];

const $ = (id) => document.getElementById(id);

const chapterSelect = $("chapterSelect");
const loadChapterBtn = $("loadChapterBtn");
const resumeBtn = $("resumeBtn");
const statusMessage = $("statusMessage");

const quizSection = $("quizSection");
const chapterTitle = $("chapterTitle");
const questionCounter = $("questionCounter");
const progressBar = $("progressBar");
const questionStem = $("questionStem");
const optionsContainer = $("optionsContainer");

const feedbackBox = $("feedbackBox");
const answerFeedback = $("answerFeedback");
const optionExplanations = $("optionExplanations");
const examTip = $("examTip");

const previousBtn = $("previousBtn");
const nextBtn = $("nextBtn");
const finishBtn = $("finishBtn");

const sessionSummary = $("sessionSummary");
const summaryAnswered = $("summaryAnswered");
const summaryCorrect = $("summaryCorrect");
const summaryPercent = $("summaryPercent");
const backToQuizBtn = $("backToQuizBtn");

const sessionChart = $("sessionChart");
const sessionTableBody = $("sessionTableBody");
const backupBtn = $("backupBtn");

let currentSession = null;
let currentQuestions = [];
let currentChapter = null;
let currentQuestionIndex = 0;
let savedData = loadSavedData();

function loadSavedData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { sessions: {}, history: [] };
    }

    const parsed = JSON.parse(raw);
    return {
      sessions: parsed.sessions || {},
      history: Array.isArray(parsed.history) ? parsed.history : []
    };
  } catch (error) {
    console.warn("Could not read saved progress:", error);
    return { sessions: {}, history: [] };
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedData));
    renderHistory();
  } catch (error) {
    console.error("Could not save progress:", error);
    statusMessage.textContent =
      "ذخیره‌سازی مرورگر در دسترس نیست؛ فضای ذخیره‌سازی را بررسی کنید.";
  }
}

function setStatus(message) {
  statusMessage.textContent = message;
}

function getQuestionList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.questions)) return data.questions;
  return [];
}

function getQuestionText(question) {
  return question.stem ||
    question.question ||
    question.text ||
    "متن سؤال موجود نیست.";
}

function getOptions(question) {
  if (Array.isArray(question.options)) {
    return question.options.map((option) => {
      if (typeof option === "string") return option;
      return option && (option.text || option.label) || "";
    });
  }

  return [];
}

function getCorrectIndex(question) {
  let value = question.correctIndex;

  if (value === undefined) value = question.answerIndex;
  if (value === undefined) value = question.correctAnswer;

  if (typeof value === "string") {
    const letters = ["A", "B", "C", "D"];
    const letterIndex = letters.indexOf(value.trim().toUpperCase());
    if (letterIndex !== -1) return letterIndex;

    const number = Number(value);
    if (Number.isInteger(number)) value = number;
  }

  if (Number.isInteger(value)) {
    // این برنامه از اندیس صفرمبنا استفاده می‌کند.
    return value;
  }

  return -1;
}

function getExplanation(question) {
  return question.explanation ||
    question.rationale ||
    question.answerExplanation ||
    "";
}

function getOptionExplanation(question, index) {
  const explanations =
    question.optionExplanations ||
    question.wrongOptionExplanations ||
    [];

  if (Array.isArray(explanations)) {
    return explanations[index] || "";
  }

  if (explanations && typeof explanations === "object") {
    return explanations[index] ||
      explanations[String.fromCharCode(65 + index)] ||
      "";
  }

  return "";
}

function getExamTip(question) {
  return question.examTip || question.examTrap || "";
}

function makeSessionKey(chapter) {
  return chapter.file;
}

function startNewSession(chapter, questions) {
  const key = makeSessionKey(chapter);
  const oldSession = savedData.sessions[key];

  // اگر نشست نیمه‌تمام وجود دارد، آن را ناخواسته بازنویسی نکن.
  if (oldSession && !oldSession.completed) {
    const continueOld = window.confirm(
      "برای این فصل یک نشست نیمه‌تمام وجود دارد.\n" +
      "برای ادامه همان نشست، گزینه «ادامه آخرین نشست» را بزنید.\n\n" +
      "آیا می‌خواهید نشست جدیدی از ابتدا شروع کنید؟"
    );

    if (!continueOld) {
      resumeSession(chapter, questions);
      return;
    }
  }

  currentChapter = chapter;
  currentQuestions = questions;
  currentQuestionIndex = 0;

  currentSession = {
    chapterFile: chapter.file,
    chapterTitle: chapter.title,
    startedAt: new Date().toISOString(),
    currentIndex: 0,
    answers: {},
    completed: false
  };

  savedData.sessions[key] = currentSession;
  saveData();
  sessionSummary.hidden = true;
  quizSection.hidden = false;
  renderQuestion();
  setStatus("نشست جدید آغاز شد. پیشرفت شما به‌صورت خودکار ذخیره می‌شود.");
}

function resumeSession(chapter, questions) {
  const key = makeSessionKey(chapter);
  const session = savedData.sessions[key];

  if (!session || session.completed) {
    setStatus("برای این فصل نشست نیمه‌تمامی پیدا نشد؛ یک نشست جدید شروع کنید.");
    return;
  }

  currentChapter = chapter;
  currentQuestions = questions;
  currentSession = session;

  currentQuestionIndex = Math.min(
    Math.max(Number(session.currentIndex) || 0, 0),
    Math.max(questions.length - 1, 0)
  );

  sessionSummary.hidden = true;
  quizSection.hidden = false;
  renderQuestion();
  setStatus("نشست قبلی بازیابی شد؛ می‌توانید از همان‌جا ادامه دهید.");
}

async function loadChapter(mode) {
  const file = chapterSelect.value;
  const chapter = chapters.find((item) => item.file === file);

  if (!chapter) {
    setStatus("لطفاً ابتدا یک فصل انتخاب کنید.");
    return;
  }

  setStatus("در حال بارگذاری سؤالات...");
  loadChapterBtn.disabled = true;
  resumeBtn.disabled = true;

  try {
    const response = await fetch(DATA_PATH + chapter.file, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    const data = await response.json();
    const questions = getQuestionList(data);

    if (!questions.length) {
      throw new Error("فایل فصل فاقد فهرست سؤال معتبر است.");
    }

    const unfinished = savedData.sessions[chapter.file];

    if (mode === "resume") {
      if (unfinished && !unfinished.completed) {
        resumeSession(chapter, questions);
      } else {
        setStatus("نشست نیمه‌تمامی برای این فصل پیدا نشد.");
      }
    } else {
      startNewSession(chapter, questions);
    }
  } catch (error) {
    console.error(error);
    setStatus(
      "بارگذاری فصل ناموفق بود. مسیر فایل JSON و قالب آن را بررسی کنید."
    );
  } finally {
    loadChapterBtn.disabled = false;
    resumeBtn.disabled = false;
  }
}

function renderQuestion() {
  if (!currentQuestions.length || !currentSession) return;

  const question = currentQuestions[currentQuestionIndex];
  const options = getOptions(question);
  const savedAnswer = currentSession.answers[currentQuestionIndex];
  const correctIndex = getCorrectIndex(question);

  questionCounter.textContent =
    `سؤال ${currentQuestionIndex + 1} از ${currentQuestions.length}`;

  const answeredCount = Object.keys(currentSession.answers).length;
  progressBar.style.width =
    `${Math.min(100, (answeredCount / currentQuestions.length) * 100)}%`;

  questionStem.textContent = getQuestionText(question);
  optionsContainer.replaceChildren();

  options.forEach((optionText, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option";

    const label = document.createElement("span");
    label.className = "option-label";
    label.textContent = String.fromCharCode(65 + index) + " —";

    const text = document.createElement("span");
    text.textContent = optionText;

    button.append(label, text);

    if (savedAnswer) {
      button.disabled = true;
      if (index === correctIndex) button.classList.add("correct");
      if (index === savedAnswer.selectedIndex && !savedAnswer.isCorrect) {
        button.classList.add("incorrect");
      }
    } else {
      button.addEventListener("click", () => selectAnswer(index));
    }

    optionsContainer.appendChild(button);
  });

  previousBtn.disabled = currentQuestionIndex === 0;
  nextBtn.textContent =
    currentQuestionIndex === currentQuestions.length - 1
      ? "مشاهده آمار نشست"
      : "سؤال بعدی";

  if (savedAnswer) {
    showFeedback(question, savedAnswer);
  } else {
    feedbackBox.hidden = true;
  }

  currentSession.currentIndex = currentQuestionIndex;
  saveData();
}

function selectAnswer(selectedIndex) {
  if (!currentSession || currentSession.completed) return;

  const question = currentQuestions[currentQuestionIndex];

  if (currentSession.answers[currentQuestionIndex]) return;

  const correctIndex = getCorrectIndex(question);
  const isCorrect = selectedIndex === correctIndex;

  currentSession.answers[currentQuestionIndex] = {
    selectedIndex,
    isCorrect,
    answeredAt: new Date().toISOString()
  };

  currentSession.currentIndex = currentQuestionIndex;
  saveData();
  renderQuestion();

  setStatus(
    isCorrect
      ? "پاسخ شما صحیح است."
      : "پاسخ شما ثبت شد. توضیح گزینه‌ها را مرور کنید."
  );
}

function showFeedback(question, savedAnswer) {
  feedbackBox.hidden = false;

  const correctIndex = getCorrectIndex(question);
  const correctText =
    correctIndex >= 0
      ? getOptions(question)[correctIndex] || ""
      : "پاسخ صحیح در فایل مشخص نشده است.";

  answerFeedback.textContent =
    (savedAnswer.isCorrect ? "آفرین، پاسخ شما صحیح است. " :
      "پاسخ شما صحیح نیست. ") +
    "پاسخ صحیح: " + correctText +
    (getExplanation(question) ? "\n\n" + getExplanation(question) : "");

  optionExplanations.replaceChildren();

  getOptions(question).forEach((option, index) => {
    const explanation = getOptionExplanation(question, index);
    if (!explanation) return;

    const item = document.createElement("div");
    item.className = "option-explanation";

    const strong = document.createElement("strong");
    strong.textContent = String.fromCharCode(65 + index) + " — ";

    const text = document.createElement("span");
    text.textContent = explanation;

    item.append(strong, text);
    optionExplanations.appendChild(item);
  });

  const tip = getExamTip(question);
  examTip.hidden = !tip;
  examTip.textContent = tip ? "نکته/تله آزمونی: " + tip : "";
}

function goToQuestion(index) {
  if (index < 0 || index >= currentQuestions.length) return;

  currentQuestionIndex = index;
  currentSession.currentIndex = index;
  saveData();
  renderQuestion();
}

function calculateStats(session) {
  const answers = Object.values(session.answers || {});
  const answered = answers.length;
  const correct = answers.filter((answer) => answer.isCorrect).length;

  return {
    answered,
    correct,
    percent: answered ? Math.round((correct / answered) * 100) : 0
  };
}

function finishSession() {
  if (!currentSession || !currentChapter) return;

  const stats = calculateStats(currentSession);
  const key = makeSessionKey(currentChapter);

  currentSession.completed = true;
  currentSession.finishedAt = new Date().toISOString();
  currentSession.stats = stats;

  savedData.sessions[key] = currentSession;
  savedData.history.push({
    chapterFile: currentChapter.file,
    chapterTitle: currentChapter.title,
    startedAt: currentSession.startedAt,
    finishedAt: currentSession.finishedAt,
    answered: stats.answered,
    correct: stats.correct,
    percent: stats.percent,
    totalQuestions: currentQuestions.length
  });

  // نشست‌های تکمیل‌شده را در تاریخچه نگه می‌داریم؛ نمودار فقط پنج مورد آخر را نشان می‌دهد.
  saveData();

  summaryAnswered.textContent = stats.answered;
  summaryCorrect.textContent = stats.correct;
  summaryPercent.textContent = stats.percent + "٪";

  quizSection.hidden = true;
  sessionSummary.hidden = false;
  renderHistory();
  setStatus("نشست پایان یافت و آمار آن ذخیره شد.");
}

function renderHistory() {
  const recent = savedData.history.slice(-5).reverse();

  sessionChart.replaceChildren();
  sessionTableBody.replaceChildren();

  if (!recent.length) {
    const empty = document.createElement("p");
    empty.className = "chart-empty";
    empty.textContent = "پس از تکمیل اولین نشست، نمودار اینجا نمایش داده می‌شود.";
    sessionChart.appendChild(empty);

    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = "هنوز نشستی ثبت نشده است.";
    row.appendChild(cell);
    sessionTableBody.appendChild(row);
    return;
  }

  recent.slice().reverse().forEach((record, index) => {
    const item = document.createElement("div");
    item.className = "chart-item";

    const percent = document.createElement("div");
    percent.className = "chart-percent";
    percent.textContent = record.percent + "٪";

    const barArea = document.createElement("div");
    barArea.className = "chart-bar-area";

    const bar = document.createElement("div");
    bar.className = "chart-bar";
    bar.style.height = Math.max(2, record.percent) + "%";
    bar.title = `${record.chapterTitle}: ${record.percent} درصد`;

    barArea.appendChild(bar);

    const label = document.createElement("div");
    label.className = "chart-label";
    label.textContent = record.chapterTitle || `نشست ${index + 1}`;

    item.append(percent, barArea, label);
    sessionChart.appendChild(item);
  });

  recent.forEach((record, index) => {
    const row = document.createElement("tr");
    const date = record.finishedAt
      ? new Date(record.finishedAt).toLocaleDateString("fa-IR")
      : "—";

    [
      recent.length - index,
      record.chapterTitle || record.chapterFile || "—",
      date,
      record.answered,
      record.correct,
      record.percent + "٪"
    ].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = String(value);
      row.appendChild(cell);
    });

    sessionTableBody.appendChild(row);
  });
}

function resumeLatestSession() {
  const unfinished = Object.values(savedData.sessions)
    .filter((session) => session && !session.completed)
    .sort((a, b) =>
      new Date(b.startedAt || 0) - new Date(a.startedAt || 0)
    )[0];

  if (!unfinished) {
    setStatus("نشست نیمه‌تمامی برای ادامه وجود ندارد.");
    return;
  }

  chapterSelect.value = unfinished.chapterFile;
  loadChapter("resume");
}

function downloadBackup() {
  const blob = new Blob(
    [JSON.stringify(savedData, null, 2)],
    { type: "application/json;charset=utf-8" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "neurolearn-backup.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function initialize() {
  chapters.forEach((chapter) => {
    const option = document.createElement("option");
    option.value = chapter.file;
    option.textContent = chapter.title;
    chapterSelect.appendChild(option);
  });

  loadChapterBtn.addEventListener("click", () => loadChapter("new"));
  resumeBtn.addEventListener("click", resumeLatestSession);

  previousBtn.addEventListener("click", () => {
    goToQuestion(currentQuestionIndex - 1);
  });

  nextBtn.addEventListener("click", () => {
    if (currentQuestionIndex === currentQuestions.length - 1) {
      finishSession();
    } else {
      goToQuestion(currentQuestionIndex + 1);
    }
  });

  finishBtn.addEventListener("click", () => {
    const confirmed = window.confirm(
      "آیا می‌خواهید نشست را پایان دهید و آمار آن ثبت شود؟"
    );
    if (confirmed) finishSession();
  });

  backToQuizBtn.addEventListener("click", () => {
    sessionSummary.hidden = true;
    quizSection.hidden = false;
    renderQuestion();
  });

  backupBtn.addEventListener("click", downloadBackup);

  renderHistory();
}

initialize();
