const courseList = document.querySelector("#courseList");
const refreshCourses = document.querySelector("#refreshCourses");
const uploadForm = document.querySelector("#uploadForm");
const courseInput = document.querySelector("#courseInput");
const imageInput = document.querySelector("#imageInput");
const cameraInput = document.querySelector("#cameraInput");
const pickPhotosButton = document.querySelector("#pickPhotosButton");
const takePhotoButton = document.querySelector("#takePhotoButton");
const clearPhotosButton = document.querySelector("#clearPhotosButton");
const fileName = document.querySelector("#fileName");
const generateButton = document.querySelector("#generateButton");
const uploadStatus = document.querySelector("#uploadStatus");
const saveCourse = document.querySelector("#saveCourse");
const editorTitle = document.querySelector("#editorTitle");
const editorStatus = document.querySelector("#editorStatus");
const logoutButton = document.querySelector("#logoutButton");
const passwordForm = document.querySelector("#passwordForm");
const currentPassword = document.querySelector("#currentPassword");
const newPassword = document.querySelector("#newPassword");
const passwordStatus = document.querySelector("#passwordStatus");

const fields = {
  title: document.querySelector("#titleInput"),
  course: document.querySelector("#courseNameInput"),
  lesson: document.querySelector("#lessonInput"),
  topic: document.querySelector("#topicInput"),
  vocabulary: document.querySelector("#vocabularyInput"),
  sentences: document.querySelector("#sentencesInput"),
  grammarNotes: document.querySelector("#grammarInput"),
  patterns: document.querySelector("#patternsInput"),
};

let courses = [];
let currentCourse = null;
let selectedFiles = [];

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => null);
  if (response.status === 401) {
    window.location.href = `/login.html?next=${encodeURIComponent(window.location.pathname)}`;
    throw new Error("请先登录后台。");
  }
  if (!response.ok) {
    throw new Error(data?.error || "请求失败");
  }
  return data;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(image.src);
      resolve(image);
    };
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });
}

async function compressImage(file) {
  const maxEdge = 1800;
  const quality = 0.82;
  const image = await loadImage(file);
  const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(image, 0, 0, width, height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob || blob.size >= file.size) return file;

  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
}

function courseLabel(course) {
  return [course.course, course.lesson || course.title, course.topic].filter(Boolean).join(" · ");
}

function renderCourseList() {
  if (!courses.length) {
    courseList.innerHTML = `<div class="empty-state compact">还没有课程。上传资料后会显示在这里。</div>`;
    return;
  }

  courseList.innerHTML = courses
    .map(
      (course) => `
        <button class="course-list-item ${currentCourse?.id === course.id ? "active" : ""}" type="button" data-course-id="${course.id}">
          <strong>${course.course || course.title}</strong>
          <span>${course.lesson || course.topic}</span>
        </button>
      `,
    )
    .join("");
}

function formatJson(value) {
  return JSON.stringify(value || [], null, 2);
}

function fillEditor(course) {
  currentCourse = course;
  editorTitle.textContent = courseLabel(course);
  fields.title.value = course.title || "";
  fields.course.value = course.course || "";
  fields.lesson.value = course.lesson || "";
  fields.topic.value = course.topic || "";
  fields.vocabulary.value = formatJson(course.vocabulary);
  fields.sentences.value = formatJson(course.sentences);
  fields.grammarNotes.value = formatJson(course.grammarNotes);
  fields.patterns.value = formatJson(course.patterns);
  saveCourse.disabled = false;
  editorStatus.textContent = "";
  renderCourseList();
}

async function loadCourses(selectId) {
  courses = await fetchJson("/api/courses");
  renderCourseList();
  if (!courses.length) return;

  const id = selectId || currentCourse?.id || courses[0].id;
  const selected = courses.find((course) => String(course.id) === String(id)) || courses[0];
  await loadCourse(selected.id);
}

async function loadCourse(id) {
  const course = await fetchJson(`/api/courses/${id}`);
  fillEditor(course);
}

async function generateNoteFromImages(files, course) {
  const formData = new FormData();
  for (const file of files) {
    formData.append("images", await compressImage(file));
  }
  formData.append("course", course);
  return fetchJson("/api/generate-note", {
    method: "POST",
    body: formData,
  });
}

function fileKey(file) {
  return [file.name, file.size, file.lastModified].join(":");
}

function addSelectedFiles(files) {
  const existing = new Set(selectedFiles.map(fileKey));
  for (const file of files) {
    if (!file.type.startsWith("image/") || existing.has(fileKey(file))) continue;
    selectedFiles.push(file);
    existing.add(fileKey(file));
  }
  updateSelectedFileSummary();
}

function updateSelectedFileSummary() {
  clearPhotosButton.hidden = selectedFiles.length === 0;
  fileName.textContent = selectedFiles.length
    ? `${selectedFiles.length} 张图片：${selectedFiles.map((file) => file.name).join("、")}`
    : "未选择文件";
}

function clearSelectedFiles() {
  selectedFiles = [];
  imageInput.value = "";
  cameraInput.value = "";
  updateSelectedFileSummary();
}

function parseJsonArray(field, label) {
  try {
    const value = JSON.parse(field.value || "[]");
    if (!Array.isArray(value)) {
      throw new Error(`${label} 必须是数组 JSON。`);
    }
    return value;
  } catch (error) {
    throw new Error(`${label} JSON 格式不正确：${error.message}`);
  }
}

function collectEditorData() {
  return {
    title: fields.title.value.trim(),
    course: fields.course.value.trim(),
    lesson: fields.lesson.value.trim(),
    topic: fields.topic.value.trim(),
    vocabulary: parseJsonArray(fields.vocabulary, "词汇"),
    sentences: parseJsonArray(fields.sentences, "例句"),
    grammarNotes: parseJsonArray(fields.grammarNotes, "语法/用法"),
    patterns: parseJsonArray(fields.patterns, "易混淆点"),
  };
}

courseList.addEventListener("click", (event) => {
  const item = event.target.closest("[data-course-id]");
  if (!item) return;
  loadCourse(item.dataset.courseId).catch((error) => {
    editorStatus.textContent = error.message;
  });
});

refreshCourses.addEventListener("click", () => {
  loadCourses().catch((error) => {
    editorStatus.textContent = error.message;
  });
});

pickPhotosButton.addEventListener("click", () => {
  imageInput.click();
});

takePhotoButton.addEventListener("click", () => {
  cameraInput.click();
});

clearPhotosButton.addEventListener("click", () => {
  clearSelectedFiles();
  uploadStatus.textContent = "";
});

imageInput.addEventListener("change", () => {
  addSelectedFiles(Array.from(imageInput.files));
  imageInput.value = "";
  uploadStatus.textContent = "";
});

cameraInput.addEventListener("change", () => {
  addSelectedFiles(Array.from(cameraInput.files));
  cameraInput.value = "";
  uploadStatus.textContent = "";
});

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const files = [...selectedFiles];
  if (!files.length) {
    uploadStatus.textContent = "请先选择至少一张照片。";
    return;
  }

  generateButton.disabled = true;
  uploadStatus.textContent = "正在压缩图片并生成课程总结...";

  try {
    const created = await generateNoteFromImages(files, courseInput.value.trim());
    localStorage.setItem("learnThaiNote.currentCourseId", String(created.id));
    uploadStatus.textContent = `已生成并保存：${created.vocabulary.length} 个词汇，${created.sentences.length} 条例句。`;
    uploadForm.reset();
    clearSelectedFiles();
    await loadCourses(created.id);
  } catch (error) {
    uploadStatus.textContent = error.message;
  } finally {
    generateButton.disabled = false;
  }
});

saveCourse.addEventListener("click", async () => {
  if (!currentCourse) return;
  saveCourse.disabled = true;
  editorStatus.textContent = "正在保存...";

  try {
    const updated = await fetchJson(`/api/courses/${currentCourse.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(collectEditorData()),
    });
    localStorage.setItem("learnThaiNote.currentCourseId", String(updated.id));
    editorStatus.textContent = "已保存。首页会使用这版内容。";
    await loadCourses(updated.id);
  } catch (error) {
    editorStatus.textContent = error.message;
  } finally {
    saveCourse.disabled = false;
  }
});

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  try {
    await fetchJson("/api/auth/logout", { method: "POST" });
  } finally {
    window.location.href = "/login.html";
  }
});

passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  passwordStatus.textContent = "正在保存密码...";

  try {
    await fetchJson("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
      }),
    });
    passwordForm.reset();
    passwordStatus.textContent = "密码已修改。";
  } catch (error) {
    passwordStatus.textContent = error.message;
  }
});

loadCourses().catch((error) => {
  courseList.innerHTML = `<div class="empty-state compact">${error.message}</div>`;
});
