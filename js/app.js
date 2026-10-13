
"use strict";

const topics = [
  { file: "01_stroke.json", label: "۱. سکته مغزی (Stroke)" },
  { file: "02_epilepsy.json", label: "۲. صرع و تشنج (Epilepsy)" },
  { file: "03_headache.json", label: "۳. سردرد (Headache)" },
  { file: "04_dementia.json", label: "۴. دمانس (Dementia)" },
  { file: "05_coma.json", label: "۵. کما و اختلال هوشیاری (Coma)" },
  { file: "06_demyelination.json", label: "۶. بیماری‌های دمیلینه‌کننده (Demyelination)" },
  { file: "07_neuroinfection.json", label: "۷. عفونت‌های عصبی (Neuroinfection)" },
  { file: "08_viral_prion.json", label: "۸. بیماری‌های ویروسی و پریونی" },
  { file: "09_degenerative.json", label: "۹. بیماری‌های نورودژنراتیو" },
  { file: "10_sleep.json", label: "۱۰. اختلالات خواب (Sleep Disorders)" }
];

const topicList = document.getElementById("topic-list");
const topicTitle = document.getElementById("topic-title");
const questionCount = document.getElementById("question-count");
const questionArea = document.getElementById("question-area");
const errorArea = document.getElementById("error-area");

let currentTopicIndex = 0;
let currentQuestions = [];
let currentQuestionIndex = 0;
let correctAnswers = 0;
let answeredQuestions = 0;
let answerLocked = false;
let requestNumber = 0;

function showError(message) {
  errorArea.textContent = message;
  errorArea.hidden = false;
}

function clearError() {
  errorArea.textContent = "";
  errorArea.hidden = true;
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderTopics() {
  topicList.replaceChildren();

  topics.forEach((topic, index) => {
    const button = createElement("button", "topic-button", topic.label);
    button.type = "button";
    button.classList.toggle("active", index === currentTopicIndex);
    button.addEventListener("click", () => loadTopic(index));
    topicList.appendChild(button);
  });
}

function updateTopicButtons() {
  const buttons = topicList.querySelectorAll("button");
  buttons.forEach((button, index) => {
    button.classList.toggle("active", index === currentTopicIndex);
  });
}

function validateQuestion(question) {
  return (
    question &&
    typeof question.stem === "string" &&
    Array.isArray(question.options) &&
    question.options.length === 4 &&
    Number.isInteger(question.correctIndex) &&
    question.correctIndex >= 0 &&
    question.correctIndex < 4
  );
}

async function loadTopic(index) {
  if (index < 0 || index >= topics.length) return;

  currentTopicIndex = index;
  currentQuestionIndex = 0;
  correctAnswers = 0;
  answeredQuestions = 0;
  answerLocked = false;

  const thisRequest = ++requestNumber;
  const topic = topics[index];

  updateTopicButtons();
  clearError();

  topicTitle.textContent = topic.label;
  questionCount.textContent = "در حال بارگذاری…";

  questionArea.replaceChildren(
    createElement("p", "loading-message", "در حال بارگذاری سؤال‌ها…")
  );

  try {
    const response = await fetch("./data/" + topic.file, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    const data = await response.json();

    if (thisRequest !== requestNumber) return;

    if (!data || !Array.isArray(data.questions)) {
      throw new Error("ساختار فایل JSON صحیح نیست.");
    }

    currentQuestions = data.questions;

    if (currentQuestions.some(question => !validateQuestion(question))) {
      throw new Error("ساختار یکی از سؤال‌ها یا گزینه‌های آن صحیح نیست.");
    }

    if (data.topic_title) {
      topicTitle.textContent = data.topic_title;
    }

    questionCount.textContent =
      currentQuestions.length.toLocaleString("fa-IR") + " سؤال";

    if (currentQuestions.length === 0) {
      questionArea.replaceChildren(
        createElement("h3", "", "هنوز سؤالی اضافه نشده است."),
        createElement("p", "", "سؤال‌های این فصل در مراحل بعد اضافه خواهند شد.")
      );
      return;
    }

    renderQuestion();
  } catch (error) {
    if (thisRequest !== requestNumber) return;

    currentQuestions = [];
    questionCount.textContent = "خطا در بارگذاری";

    questionArea.replaceChildren(
      createElement("h3", "", "بارگذاری این فصل ناموفق بود."),
      createElement(
        "p",
        "",
        "لطفاً مسیر فایل، نام فایل و ساختار JSON را بررسی کنید."
      )
    );

    showError(
      "فایل مورد انتظار: data/" +
      topic.file +
      " | جزئیات خطا: " +
      error.message
    );
  }
}

function renderQuestion() {
  answerLocked = false;
  clearError();

  const question = currentQuestions[currentQuestionIndex];
  questionArea.replaceChildren();

  const progress = createElement(
    "p",
    "question-meta",
    "سؤال " +
      (currentQuestionIndex + 1).toLocaleString("fa-IR") +
      " از " +
      currentQuestions.length.toLocaleString("fa-IR")
  );

  const score = createElement(
    "p",
    "question-meta",
    "پاسخ صحیح: " +
      correctAnswers.toLocaleString("fa-IR") +
      " از " +
      answeredQuestions.toLocaleString("fa-IR")
  );

  const card = createElement("div", "question-card");
  card.appendChild(progress);
  card.appendChild(score);

  if (question.id) {
    card.appendChild(createElement("p", "question-id", question.id));
  }

  card.appendChild(createElement("h3", "question-stem", question.stem));

  const optionsContainer = createElement("div", "options-list");
  const feedback = createElement("div", "feedback");
  feedback.hidden = true;

  question.options.forEach((option, index) => {
    const button = createElement(
      "button",
      "option-button",
      String.fromCharCode(65 + index) + ". " + option
    );

    button.type = "button";

    button.addEventListener("click", () => {
      if (answerLocked) return;

      answerLocked = true;
      answeredQuestions++;

      const isCorrect = index === question.correctIndex;

      if (isCorrect) {
        correctAnswers++;
        button.classList.add("correct");
      } else {
        button.classList.add("incorrect");
      }

      const optionButtons = optionsContainer.querySelectorAll("button");

      optionButtons.forEach((optionButton, optionIndex) => {
        optionButton.disabled = true;

        if (optionIndex === question.correctIndex) {
          optionButton.classList.add("correct");
        }
      });

      feedback.replaceChildren();

      feedback.appendChild(
        createElement(
          "h4",
          "",
          isCorrect ? "پاسخ صحیح است" : "پاسخ صحیح نیست"
        )
      );

      if (question.explanation) {
        feedback.appendChild(
          createElement("p", "explanation", question.explanation)
        );
      }

      if (Array.isArray(question.optionExplanations)) {
        const explanationList = createElement("div", "option-explanations");

        question.options.forEach((optionText, optionIndex) => {
          const explanationText =
            question.optionExplanations[optionIndex];

          if (!explanationText) return;

          explanationList.appendChild(
            createElement(
              "p",
              "",
              String.fromCharCode(65 + optionIndex) +
                ". " +
                explanationText
            )
          );
        });

        feedback.appendChild(explanationList);
      }

      if (question.examTip) {
        feedback.appendChild(
          createElement("p", "exam-tip", "نکته آزمونی: " + question.examTip)
        );
      }

      if (question.source) {
        feedback.appendChild(
          createElement("p", "source", "منبع: " + question.source)
        );
      }

      const updatedScore = card.querySelectorAll(".question-meta")[1];

      if (updatedScore) {
        updatedScore.textContent =
          "پاسخ صحیح: " +
          correctAnswers.toLocaleString("fa-IR") +
          " از " +
          answeredQuestions.toLocaleString("fa-IR");
      }

      const nextButton = createElement(
        "button",
        "next-button",
        currentQuestionIndex + 1 < currentQuestions.length
          ? "سؤال بعدی ←"
          : "پایان فصل"
      );

      nextButton.type = "button";

      nextButton.addEventListener("click", () => {
        if (currentQuestionIndex + 1 < currentQuestions.length) {
          currentQuestionIndex++;
          renderQuestion();
        } else {
          renderSummary();
        }
      });

      feedback.appendChild(nextButton);
      feedback.hidden = false;
    });

    optionsContainer.appendChild(button);
  });

  card.appendChild(optionsContainer);
  card.appendChild(feedback);
  questionArea.appendChild(card);
}

function renderSummary() {
  questionArea.replaceChildren(
    createElement("h3", "", "این فصل به پایان رسید."),
    createElement(
      "p",
      "",
      "تعداد پاسخ صحیح: " +
        correctAnswers.toLocaleString("fa-IR") +
        " از " +
        answeredQuestions.toLocaleString("fa-IR")
    )
  );

  const restartButton = createElement("button", "next-button", "مرور دوباره فصل");
  restartButton.type = "button";
  restartButton.addEventListener("click", () => loadTopic(currentTopicIndex));

  questionArea.appendChild(restartButton);
}

if (topicList && topicTitle && questionCount && questionArea && errorArea) {
  renderTopics();
  loadTopic(0);
} else {
  console.error("عناصر لازم در index.html پیدا نشدند.");
}
