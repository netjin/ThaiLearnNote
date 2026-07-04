const starterVocabulary = [
  { zh: "警察局", en: "Police station", th: "สถานีตำรวจ", rtgs: "sa-tha-nii tam-ruat" },
  { zh: "洗手间、厕所", en: "Toilet", th: "ห้องน้ำ", rtgs: "hông náam" },
  { zh: "公交车站", en: "Bus stop", th: "ป้ายรถเมล์", rtgs: "pâai rót mee" },
  { zh: "火车站", en: "Train station", th: "สถานีรถไฟ", rtgs: "sa-tha-nii rót fai" },
  { zh: "酒店、旅馆", en: "Hotel", th: "โรงแรม", rtgs: "roong raaem" },
  { zh: "医院", en: "Hospital", th: "โรงพยาบาล", rtgs: "roong pha-yaa-baan" },
  { zh: "药店", en: "Drug store / Pharmacy", th: "ร้านขายยา", rtgs: "ráan khǎai yaa" },
  { zh: "加油站", en: "Gas station", th: "ปั๊มน้ำมัน", rtgs: "pám náam-man" },
  { zh: "长途汽车站", en: "Bus terminal", th: "สถานีรถโดยสาร", rtgs: "sa-tha-nii rót dooi-sǎan" },
  { zh: "游客服务中心", en: "Tourist center", th: "ศูนย์บริการนักท่องเที่ยว", rtgs: "sǔun bò-ri-gaan nák thông-thîao" },
  { zh: "机场", en: "Airport", th: "สนามบิน", rtgs: "sa-nǎam bin" },
  { zh: "市场", en: "Market", th: "ตลาด", rtgs: "ta-làat" },
  { zh: "百货商店", en: "Department store", th: "ห้าง", rtgs: "hâang" },
  { zh: "银行", en: "Bank", th: "ธนาคาร", rtgs: "tha-naa-khaan" },
  { zh: "邮局", en: "Post office", th: "ไปรษณีย์", rtgs: "bprai-sa-nii" },
  { zh: "学校", en: "School", th: "โรงเรียน", rtgs: "roong rian" },
  { zh: "买东西、购物", en: "Shopping", th: "ซื้อของ", rtgs: "súe khǎawng" },
  { zh: "工作", en: "Work", th: "ทำงาน", rtgs: "tham ngaan" },
  { zh: "找朋友、见朋友", en: "Meet friends", th: "หาเพื่อน", rtgs: "hǎa phʉ̂an" },
  { zh: "拜佛、拜寺庙", en: "Visit temples", th: "ไหว้พระ", rtgs: "wâai phrá" },
];

const starterPatterns = [
  { th: "โรง", rtgs: "roong", zh: "楼、建筑", examples: "โรงแรม（酒店）、โรงพยาบาล（医院）、โรงเรียน（学校）" },
  { th: "สถานี", rtgs: "sa-tha-nii", zh: "站、车站", examples: "สถานีตำรวจ（警察局）、สถานีรถไฟ（火车站）、สถานีรถโดยสาร（汽车站）" },
  { th: "ร้าน", rtgs: "ráan", zh: "店铺", examples: "ร้านขายยา（药店）" },
  { th: "สนาม", rtgs: "sa-nǎam", zh: "场地、场所", examples: "สนามบิน（机场）" },
];

const starterSentences = [
  { th: "ไปโรงพยาบาล", rtgs: "pai roong pha-yaa-baan", zh: "去医院。" },
  { th: "ไปตลาด", rtgs: "pai ta-làat", zh: "去市场。" },
  { th: "ไปธนาคาร", rtgs: "pai tha-naa-khaan", zh: "去银行。" },
  { th: "ไปโรงเรียน", rtgs: "pai roong rian", zh: "去学校。" },
  { th: "ไปสนามบิน", rtgs: "pai sa-nǎam bin", zh: "去机场。" },
  { th: "ไปห้องน้ำ", rtgs: "pai hông náam", zh: "去洗手间。" },
];

const cardsView = document.querySelector("#cardsView");
const tableView = document.querySelector("#tableView");
const vocabTable = document.querySelector("#vocabTable");
const searchInput = document.querySelector("#searchInput");
const hideMeaning = document.querySelector("#hideMeaning");
const visibleCount = document.querySelector("#visibleCount");
const sentenceCount = document.querySelector("#sentenceCount");
const patternCount = document.querySelector("#patternCount");
const grammarNotes = document.querySelector("#grammarNotes");
const courseEyebrow = document.querySelector("#courseEyebrow");
const courseMenuButton = document.querySelector("#courseMenuButton");
const courseSelectLabel = document.querySelector("#courseSelectLabel");
const courseMenu = document.querySelector("#courseMenu");
const previousCourse = document.querySelector("#previousCourse");
const nextCourse = document.querySelector("#nextCourse");

let courses = [];

let note = {
  title: "Places",
  course: "7.1 学习笔记",
  lesson: "Places",
  topic: "地点",
  vocabulary: starterVocabulary,
  patterns: starterPatterns,
  sentences: starterSentences,
  grammarNotes: [],
};

function speakThai(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "th-TH";
  utterance.rate = 0.82;
  window.speechSynthesis.speak(utterance);
}

function normalize(text) {
  return text.toLowerCase().trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function hasThai(text) {
  return /[\u0E00-\u0E7F]/.test(String(text || ""));
}

function splitThaiAndPronunciation(value) {
  const text = String(value || "").trim();
  if (!text.includes("/")) return null;

  const [thaiPart, ...pronunciationParts] = text.split("/");
  const thai = thaiPart.trim();
  const pronunciation = pronunciationParts.join("/").trim();
  if (!hasThai(thai) || !pronunciation) return null;
  return { thai, pronunciation };
}

function formatSentence(item) {
  const rawThai = String(item.th || "").trim();
  const rawPronunciation = String(item.rtgs || "").trim();
  const splitFromPronunciation = splitThaiAndPronunciation(rawPronunciation);

  if (!hasThai(rawThai) && splitFromPronunciation) {
    return {
      thai: splitFromPronunciation.thai,
      pronunciation: splitFromPronunciation.pronunciation,
      meaning: item.zh || rawThai,
      context: rawThai,
    };
  }

  return {
    thai: rawThai,
    pronunciation: rawPronunciation,
    meaning: item.zh || "",
    context: "",
  };
}

function getDisplaySentences() {
  return note.sentences.map(formatSentence).filter((sentence) => hasThai(sentence.thai));
}

function getFilteredVocabulary() {
  const query = normalize(searchInput.value);
  if (!query) return note.vocabulary;
  return note.vocabulary.filter((item) => normalize(`${item.zh} ${item.en} ${item.th} ${item.rtgs}`).includes(query));
}

function renderCards(items) {
  cardsView.innerHTML = items
    .map(
      (item, index) => `
        <article class="card ${hideMeaning.checked ? "masked" : ""}" data-index="${index}">
          <div class="card-inner">
            <div class="card-face">
              <span class="tag">${item.en}</span>
              <strong class="thai" lang="th">${item.th}</strong>
              <p class="rtgs">${item.rtgs}</p>
              <div class="card-actions">
                <button class="icon-button" type="button" data-speak="${item.th}" aria-label="播放 ${item.th}">▶</button>
                <button class="text-button" type="button" data-flip>看释义</button>
              </div>
            </div>
            <div class="card-face card-back">
              <span class="tag">中文 / English</span>
              <p class="meaning">${item.zh}</p>
              <p class="english">${item.en}</p>
              <p class="rtgs">${item.rtgs}</p>
              <div class="card-actions">
                <button class="icon-button" type="button" data-speak="${item.th}" aria-label="播放 ${item.th}">▶</button>
                <button class="text-button" type="button" data-flip>回到泰语</button>
              </div>
            </div>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderTable(items) {
  vocabTable.innerHTML = items
    .map(
      (item) => `
        <tr>
          <td>${item.zh}</td>
          <td>${item.en}</td>
          <td lang="th">${item.th}</td>
          <td>${item.rtgs}</td>
          <td><button class="icon-button" type="button" data-speak="${item.th}" aria-label="播放 ${item.th}">▶</button></td>
        </tr>
      `,
    )
    .join("");
}

function renderPatterns() {
  document.querySelector("#patterns").innerHTML = note.patterns
    .map(
      (item) => `
        <article class="pattern-card">
          <div class="pattern-head">
            <strong lang="th">${item.th}</strong>
            <button class="icon-button" type="button" data-speak="${item.th}" aria-label="播放 ${item.th}">▶</button>
          </div>
          <p class="rtgs">${item.rtgs} · ${item.zh}</p>
          <p>${item.examples}</p>
        </article>
      `,
    )
    .join("");
}

function renderSentences() {
  const sentences = getDisplaySentences();
  document.querySelector("#sentences").innerHTML = sentences.length
    ? sentences
        .map(
          (sentence) => `
        <article class="sentence-card">
          <div>
            ${sentence.context ? `<span class="sentence-context">${escapeHtml(sentence.context)}</span>` : ""}
            <strong lang="th">${escapeHtml(sentence.thai)}</strong>
            <p class="sentence-pronunciation">${escapeHtml(sentence.pronunciation)}</p>
            <p class="sentence-meaning">${escapeHtml(sentence.meaning)}</p>
          </div>
          <button class="icon-button" type="button" data-speak="${escapeHtml(sentence.thai)}" aria-label="播放 ${escapeHtml(sentence.thai)}">▶</button>
        </article>
      `,
        )
        .join("")
    : `<div class="empty-state compact">当前课程暂无可直接朗读的泰语例句。</div>`;
}

function renderGrammarNotes() {
  grammarNotes.innerHTML = note.grammarNotes.length
    ? note.grammarNotes
        .map(
          (item) => `
            <article class="grammar-card">
              <strong>${item.point}</strong>
              <p>${item.explanation}</p>
              ${item.examples ? `<span>${item.examples}</span>` : ""}
            </article>
          `,
        )
        .join("")
    : `<div class="empty-state compact">当前课程暂无单独语法说明。</div>`;
}

function renderVocabulary() {
  const items = getFilteredVocabulary();
  visibleCount.textContent = items.length;
  sentenceCount.textContent = getDisplaySentences().length;
  patternCount.textContent = note.patterns.length;
  renderCards(items);
  renderTable(items);
}

function simplifyTitle(title) {
  return String(title || "")
    .replace(/^Thai:\s*/i, "")
    .split(/[—-]\s*/)
    .filter(Boolean)[0]
    ?.replace(/\s+/g, " ")
    .trim();
}

function renderHeader() {
  const primaryTitle = simplifyTitle(note.lesson) || simplifyTitle(note.title) || "课程学习笔记";
  const secondaryTitle = String(note.topic || "").trim();
  courseEyebrow.textContent = note.course || "Thai Course Note";
  document.querySelector("h1").innerHTML = `${escapeHtml(primaryTitle)}${secondaryTitle ? ` <span>${escapeHtml(secondaryTitle)}</span>` : ""}`;
}

function getCourseLabel(course) {
  const label = [course.topic, course.lesson, course.title, course.course]
    .map((value) => String(value || "").trim())
    .find(Boolean);
  const simpleLabel = (label || "课程学习笔记")
    .replace(/^Thai:\s*/i, "")
    .split(/[\/·]/)[0]
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return simpleLabel.length > 36 ? `${simpleLabel.slice(0, 35)}...` : simpleLabel;
}

function closeCourseMenu() {
  courseMenu.classList.add("hidden");
  courseMenuButton.setAttribute("aria-expanded", "false");
}

function toggleCourseMenu() {
  const isOpen = !courseMenu.classList.contains("hidden");
  courseMenu.classList.toggle("hidden", isOpen);
  courseMenuButton.setAttribute("aria-expanded", String(!isOpen));
}

function renderCourseSwitcher() {
  if (!courses.length) {
    courseSelectLabel.textContent = "暂无已保存课程";
    courseMenu.innerHTML = "";
    closeCourseMenu();
    courseMenuButton.disabled = true;
    previousCourse.disabled = true;
    nextCourse.disabled = true;
    return;
  }

  courseMenuButton.disabled = false;
  previousCourse.disabled = courses.length < 2;
  nextCourse.disabled = courses.length < 2;
  courseMenu.innerHTML = courses
    .map((course) => {
      const active = String(course.id) === String(note.id);
      return `
        <button class="course-menu-item ${active ? "active" : ""}" type="button" role="option" data-course-option="${course.id}" aria-selected="${active}">
          ${escapeHtml(getCourseLabel(course))}
        </button>
      `;
    })
    .join("");
  courseSelectLabel.textContent = "切换课程";
}

function renderAll() {
  searchInput.value = "";
  renderHeader();
  renderCourseSwitcher();
  renderVocabulary();
  renderGrammarNotes();
  renderPatterns();
  renderSentences();
}

function applyCourse(saved) {
  note = {
    id: saved.id,
    title: saved.title || "课程学习笔记",
    course: saved.course || saved.title || "Thai Course",
    lesson: saved.lesson || saved.topic || "Lesson",
    topic: saved.topic || "Thai",
    vocabulary: saved.vocabulary || [],
    patterns: saved.patterns || [],
    sentences: saved.sentences || [],
    grammarNotes: saved.grammarNotes || [],
  };
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) return null;
  return response.json();
}

async function loadSavedCourse() {
  try {
    courses = (await fetchJson("/api/courses")) || [];
    const selectedId = localStorage.getItem("learnThaiNote.currentCourseId");
    let dbCourse = selectedId ? await fetchJson(`/api/courses/${selectedId}`) : null;
    if (selectedId && !dbCourse) {
      localStorage.removeItem("learnThaiNote.currentCourseId");
      localStorage.removeItem("learnThaiNote.currentCourse");
    }
    dbCourse = dbCourse || (await fetchJson("/api/courses/latest"));
    if (dbCourse?.vocabulary?.length) {
      applyCourse(dbCourse);
      localStorage.setItem("learnThaiNote.currentCourseId", String(dbCourse.id));
      return true;
    }

    if (selectedId) return false;
    const legacySaved = JSON.parse(localStorage.getItem("learnThaiNote.currentCourse") || "null");
    if (legacySaved?.vocabulary?.length) {
      applyCourse(legacySaved);
      return true;
    }
  } catch {
    localStorage.removeItem("learnThaiNote.currentCourse");
    localStorage.removeItem("learnThaiNote.currentCourseId");
  }
  return false;
}

async function selectCourseById(id) {
  const selected = await fetchJson(`/api/courses/${id}`);
  if (!selected?.vocabulary?.length) return;
  applyCourse(selected);
  localStorage.setItem("learnThaiNote.currentCourseId", String(selected.id));
  renderAll();
}

function getCurrentCourseIndex() {
  return courses.findIndex((course) => String(course.id) === String(note.id));
}

function selectCourseByOffset(offset) {
  if (!courses.length) return;
  const currentIndex = getCurrentCourseIndex();
  const startIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = (startIndex + offset + courses.length) % courses.length;
  selectCourseById(courses[nextIndex].id);
}

document.addEventListener("click", (event) => {
  const courseButton = event.target.closest("#courseMenuButton");
  if (courseButton) {
    toggleCourseMenu();
    return;
  }

  const courseOption = event.target.closest("[data-course-option]");
  if (courseOption) {
    closeCourseMenu();
    selectCourseById(courseOption.dataset.courseOption);
    return;
  }

  if (!event.target.closest(".course-picker")) {
    closeCourseMenu();
  }

  const speakButton = event.target.closest("[data-speak]");
  if (speakButton) {
    speakThai(speakButton.dataset.speak);
    return;
  }

  const flipButton = event.target.closest("[data-flip]");
  if (flipButton) {
    flipButton.closest(".card").classList.toggle("flipped");
    return;
  }

  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    document.querySelectorAll("[data-view]").forEach((button) => button.classList.remove("active"));
    viewButton.classList.add("active");
    cardsView.classList.toggle("hidden", viewButton.dataset.view !== "cards");
    tableView.classList.toggle("hidden", viewButton.dataset.view !== "table");
  }
});

searchInput.addEventListener("input", renderVocabulary);
hideMeaning.addEventListener("change", renderVocabulary);
previousCourse.addEventListener("click", () => selectCourseByOffset(-1));
nextCourse.addEventListener("click", () => selectCourseByOffset(1));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeCourseMenu();
});

renderAll();
loadSavedCourse().then((loaded) => {
  if (loaded) renderAll();
});
