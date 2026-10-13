const topics = [
  { file: "01_stroke.json", label: "۱. عروق مغزی (Stroke)" },
  { file: "02_epilepsy.json", label: "۲. صرع و تشنج (Epilepsy)" },
  { file: "03_headache.json", label: "۳. سردرد (Headache)" },
  { file: "04_dementia.json", label: "۴. شناخت و دمانس (Cognition)" },
  { file: "05_coma.json", label: "۵. کما (Coma)" },
  { file: "06_demyelination.json", label: "۶. دمیلیناسیون (Demyelination)" },
  { file: "07_neuroinfection.json", label: "۷. عفونت‌های عصبی (Neuroinfection)" },
  { file: "08_viral_prion.json", label: "۸. ویروسی و پریونی (Viral/Prion)" },
  { file: "09_degenerative.json", label: "۹. بیماری‌های نورودژنراتیو (Neurodegenerative)" },
  { file: "10_sleep.json", label: "۱۰. اختلالات خواب (Sleep)" }
];

const list = document.getElementById("topic-list");
const title = document.getElementById("topic-title");
const count = document.getElementById("question-count");
const area = document.getElementById("question-area");
const errorBox = document.getElementById("error-area");

let currentQuestions = [];
let currentIndex = 0;
let answeredCount = 0;
let correctCount = 0;

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function showMessage(heading, message) {
  area.replaceChildren();
  area.className = "empty-state";
  area.append(
    makeElement("h3", "", heading),
    makeElement("p", "", message)
  );
}

function renderQuestion() {
  area.replaceChildren();
  area.className = "";

  if (!currentQuestions.length) {
    showMessage(
      "هنوز سؤالی ثبت نشده است",
      "در مراحل بعدی سؤالات این فصل را اضافه می‌کنیم."
    );
    return;
  }

  const q = currentQuestions[currentIndex];
  const card = makeElement("article", "question-card");
  const meta = makeElement(
    "div",
    "question-meta",
    `سؤال ${currentIndex + 1} از ${currentQuestions.length}`
  );

  const stem = makeElement("p", "question-stem", q.stem);
  const options = makeElement("div", "options");
  const feedback = makeElement("div", "answer-feedback");
  feedback.hidden = true;

  const optionButtons = [];

  (q.options || []).forEach((option, index) => {
    const button = makeElement(
      "button",
      "option option-button",
      `${["الف", "ب", "ج", "د"][index] || index + 1}) ${option}`
    );
    button.type = "button";
    button.addEventListener("click", () => {
      if (optionButtons.some(item => item.disabled)) return;

      optionButtons.forEach(item => {
        item.disabled = true;
      });

      const isCorrect = index === q.correctIndex;

      if (isCorrect) {
        button.classList.add("correct");
        feedback.append(
          makeElement("h3", "correct-text", "پاسخ شما صحیح است")
        );
        correctCount++;
      } else {
        button.classList.add("incorrect");
        if (optionButtons[q.correctIndex]) {
          optionButtons[q.correctIndex].classList.add("correct");
        }
        feedback.append(
          makeElement("h3", "incorrect-text", "پاسخ شما نادرست است")
        );
      }

      answeredCount++;

      if (q.explanation) {
        feedback.append(
          makeElement("h4", "", "توضیح پاسخ صحیح"),
          makeElement("p", "", q.explanation)
        );
      }

      if (Array.isArray(q.optionExplanations)) {
        const heading = makeElement("h4", "", "بررسی گزینه‌ها");
        const details = makeElement("ul", "option-explanations");

        q.options.forEach((text, i) => {
          const explanation = q.optionExplanations[i];
          if (explanation) {
            details.appendChild(
              makeElement(
                "li",
                "",
                `${["الف", "ب", "ج", "د"][i] || i + 1}) ${explanation}`
              )
            );
          }
        });

        if (details.childElementCount) {
          feedback.append(heading, details);
        }
      }

      if (q.examTip) {
        feedback.append(
          makeElement("h4", "", "نکته آزمونی"),
          makeElement("p", "", q.examTip)
        );
      }

      if (q.source) {
        feedback.append(
          makeElement("h4", "", "منبع"),
          makeElement("p", "", q.source)
        );
      }

      count.textContent =
        `${correctCount.toLocaleString("fa-IR")} پاسخ صحیح از ` +
        `${answeredCount.toLocaleString("fa-IR")} پاسخ`;

      feedback.hidden = false;
      nextButton.hidden = false;
    });

    optionButtons.push(button);
    options.appendChild(button);
  });

  const nextButton = makeElement(
    "button",
    "next-button",
    currentIndex === currentQuestions.length - 1
      ? "بازگشت به ابتدای فصل"
      : "سؤال بعدی"
  );
  nextButton.type = "button";
  nextButton.hidden = true;

  nextButton.addEventListener("click", () => {
    if (currentIndex === currentQuestions.length - 1) {
      currentIndex = 0;
    } else {
      currentIndex++;
    }
    renderQuestion();
  });

  card.append(meta, stem, options, feedback, nextButton);
  area.appendChild(card);
}

async function loadTopic(topic, button) {
  document.querySelectorAll(".topic-button").forEach(item => {
    item.classList.toggle("active", item === button);
  });

  errorBox.hidden = true;
  title.textContent = topic.label;
  count.textContent = "در حال بارگذاری…";
  showMessage("در حال بارگذاری", "لطفاً صبر کنید.");

  currentQuestions = [];
  currentIndex = 0;
  answeredCount = 0;
  correctCount = 0;

  try {
    const response = await fetch(`./data/${topic.file}`);

    if (!response.ok) {
      throw new Error(`فایل ${topic.file} پیدا نشد.`);
    }

    const data = await response.json();
    currentQuestions = Array.isArray(data)
      ? data
      : (data.questions || []);

    currentQuestions = currentQuestions.filter(q =>
      q &&
      typeof q.stem === "string" &&
      Array.isArray(q.options) &&
      q.options.length === 4 &&
      Number.isInteger(q.correctIndex) &&
      q.correctIndex >= 0 &&
      q.correctIndex < 4
    );

    title.textContent = data.topic_title || topic.label;
    count.textContent =
      `${currentQuestions.length.toLocaleString("fa-IR")} سؤال`;

    renderQuestion();
  } catch (error) {
    count.textContent = "خطا";
    showMessage(
      "بارگذاری فصل ناموفق بود",
      "فایل JSON یا اتصال آن را بررسی کنید."
    );
    errorBox.textContent = error.message;
    errorBox.hidden = false;
  }
}

topics.forEach(topic => {
  const button = makeElement("button", "topic-button", topic.label);
  button.type = "button";
  button.addEventListener("click", () => loadTopic(topic, button));
  list.appendChild(button);
});

if (topics.length) {
  loadTopic(topics[0], list.firstElementChild);
}
