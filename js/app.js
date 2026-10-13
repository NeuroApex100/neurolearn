
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

function showMessage(heading, message) {
  area.className = "empty-state";
  area.replaceChildren();

  const h3 = document.createElement("h3");
  h3.textContent = heading;

  const p = document.createElement("p");
  p.textContent = message;

  area.append(h3, p);
}

function renderQuestions(questions) {
  area.className = "";
  area.replaceChildren();

  questions.forEach((q, i) => {
    const card = document.createElement("article");
    card.className = "question-card";

    const meta = document.createElement("div");
    meta.className = "question-meta";
    meta.textContent = `سؤال ${(i + 1).toLocaleString("fa-IR")}`;

    const stem = document.createElement("p");
    stem.textContent = q.stem || "متن سؤال ثبت نشده است.";

    const options = document.createElement("div");
    options.className = "options";

    (q.options || []).forEach((option, j) => {
      const item = document.createElement("div");
      item.className = "option";
      item.textContent = `${["الف", "ب", "ج", "د"][j] || ""}) ${option}`;
      options.appendChild(item);
    });

    card.append(meta, stem, options);
    area.appendChild(card);
  });
}

async function loadTopic(topic, button) {
  document.querySelectorAll(".topic-button").forEach((item) => {
    item.classList.toggle("active", item === button);
  });

  errorBox.hidden = true;
  title.textContent = topic.label;
  count.textContent = "…";
  showMessage("در حال بارگذاری", "لطفاً کمی صبر کنید.");

  try {
    // فایل‌های JSON فعلاً در ریشه مخزن هستند.
    const response = await fetch(`./${topic.file}`);

    if (!response.ok) {
      throw new Error(`فایل ${topic.file} پیدا نشد.`);
    }

    const data = await response.json();
    const questions = Array.isArray(data)
      ? data
      : (data.questions || []);

    title.textContent = data.topic_title || topic.label;
    count.textContent = `${questions.length.toLocaleString("fa-IR")} سؤال`;

    if (questions.length > 0) {
      renderQuestions(questions);
    } else {
      showMessage(
        "هنوز سؤالی ثبت نشده است",
        "سؤالات این فصل در مراحل بعدی اضافه خواهند شد."
      );
    }
  } catch (error) {
    count.textContent = "خطا";
    showMessage(
      "بارگذاری فصل ناموفق بود",
      "نام فایل JSON و قالب محتوای آن را بررسی کنید."
    );
    errorBox.textContent = error.message;
    errorBox.hidden = false;
  }
}

topics.forEach((topic) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "topic-button";
  button.textContent = topic.label;
  button.addEventListener("click", () => loadTopic(topic, button));
  list.appendChild(button);
});

if (topics.length > 0) {
  loadTopic(topics[0], list.firstElementChild);
}
