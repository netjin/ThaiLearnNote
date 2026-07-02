const uploadForm = document.querySelector("#uploadForm");
const courseInput = document.querySelector("#courseInput");
const imageInput = document.querySelector("#imageInput");
const fileName = document.querySelector("#fileName");
const generateButton = document.querySelector("#generateButton");
const uploadStatus = document.querySelector("#uploadStatus");
const resultTitle = document.querySelector("#resultTitle");
const resultPreview = document.querySelector("#resultPreview");
const saveButton = document.querySelector("#saveButton");
let latestNote = null;

async function generateNoteFromImages(files, course) {
  const formData = new FormData();
  for (const file of files) {
    formData.append("images", file);
  }
  formData.append("course", course);

  const response = await fetch("/api/generate-note", {
    method: "POST",
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "生成失败");
  }
  return data;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderPreview(note) {
  resultTitle.textContent = `${note.course} · ${note.lesson}`;
  resultPreview.className = "result-preview";
  saveButton.classList.remove("hidden");
  resultPreview.innerHTML = `
    <section>
      <h3>词汇</h3>
      <div class="mini-list">
        ${note.vocabulary
          .map(
            (item) => `
              <article>
                <strong lang="th">${escapeHtml(item.th)}</strong>
                <span>${escapeHtml(item.rtgs)} · ${escapeHtml(item.zh)} · ${escapeHtml(item.en)}</span>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
    <section>
      <h3>语法/用法</h3>
      <div class="mini-list">
        ${note.grammarNotes
          .map(
            (item) => `
              <article>
                <strong>${escapeHtml(item.point)}</strong>
                <span>${escapeHtml(item.explanation)}${item.examples ? ` · ${escapeHtml(item.examples)}` : ""}</span>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
    <section>
      <h3>容易混淆</h3>
      <div class="mini-list">
        ${note.patterns
          .map(
            (item) => `
              <article>
                <strong lang="th">${escapeHtml(item.th)}</strong>
                <span>${escapeHtml(item.rtgs)} · ${escapeHtml(item.zh)}</span>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
    <section>
      <h3>实用例句</h3>
      <div class="mini-list">
        ${note.sentences
          .map(
            (item) => `
              <article>
                <strong lang="th">${escapeHtml(item.th)}</strong>
                <span>${escapeHtml(item.rtgs)} · ${escapeHtml(item.zh)}</span>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

imageInput.addEventListener("change", () => {
  const files = Array.from(imageInput.files);
  fileName.textContent = files.length ? `${files.length} 张图片：${files.map((file) => file.name).join("、")}` : "未选择文件";
  uploadStatus.textContent = "";
});

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const files = Array.from(imageInput.files);
  if (!files.length) {
    uploadStatus.textContent = "请先选择至少一张照片。";
    return;
  }

  generateButton.disabled = true;
  uploadStatus.textContent = "正在合并识别图片并生成课程总结...";

  try {
    latestNote = await generateNoteFromImages(files, courseInput.value.trim());
    renderPreview(latestNote);
    uploadStatus.textContent = `已生成：${latestNote.vocabulary.length} 个词汇，${latestNote.grammarNotes.length} 条语法说明，${latestNote.sentences.length} 条例句。`;
  } catch (error) {
    uploadStatus.textContent = error.message;
  } finally {
    generateButton.disabled = false;
  }
});

saveButton.addEventListener("click", () => {
  if (!latestNote) return;
  if (latestNote.id) {
    localStorage.setItem("learnThaiNote.currentCourseId", String(latestNote.id));
  }
  localStorage.setItem("learnThaiNote.currentCourse", JSON.stringify(latestNote));
  uploadStatus.textContent = "已保存到首页。返回学习卡片即可复习这门课程。";
});
