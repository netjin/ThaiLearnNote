import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getAdminPasswordHash,
  getCourse,
  getLatestCourse,
  listCourses,
  saveCourse,
  updateAdminPassword,
  updateCourse,
  verifyAdminPassword,
} from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "4mb" }));
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("只支持图片文件"));
      return;
    }
    cb(null, true);
  },
});

const sessionCookieName = "learn_thai_admin";
const sessionMaxAgeSeconds = 60 * 60 * 12;

const noteSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    course: { type: "string" },
    lesson: { type: "string" },
    topic: { type: "string" },
    vocabulary: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          zh: { type: "string" },
          en: { type: "string" },
          th: { type: "string" },
          rtgs: { type: "string" },
        },
        required: ["zh", "en", "th", "rtgs"],
      },
    },
    patterns: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          th: { type: "string" },
          rtgs: { type: "string" },
          zh: { type: "string" },
          examples: { type: "string" },
        },
        required: ["th", "rtgs", "zh", "examples"],
      },
    },
    sentences: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          th: { type: "string" },
          rtgs: { type: "string" },
          zh: { type: "string" },
        },
        required: ["th", "rtgs", "zh"],
      },
    },
    grammarNotes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          point: { type: "string" },
          explanation: { type: "string" },
          examples: { type: "string" },
        },
        required: ["point", "explanation", "examples"],
      },
    },
  },
  required: ["title", "course", "lesson", "topic", "vocabulary", "patterns", "sentences", "grammarNotes"],
};

function extractOutputText(responseJson) {
  if (typeof responseJson.output_text === "string") return responseJson.output_text;

  const parts = [];
  for (const item of responseJson.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        parts.push(content.text);
      }
    }
  }
  return parts.join("\n").trim();
}

function normalizeNote(note) {
  return {
    title: note.title?.trim() || "课程学习笔记",
    course: note.course?.trim() || "Thai Course",
    lesson: note.lesson?.trim() || note.title?.trim() || "Lesson",
    topic: note.topic?.trim() || "Thai",
    vocabulary: Array.isArray(note.vocabulary) ? note.vocabulary : [],
    patterns: Array.isArray(note.patterns) ? note.patterns : [],
    sentences: Array.isArray(note.sentences) ? note.sentences : [],
    grammarNotes: Array.isArray(note.grammarNotes) ? note.grammarNotes : [],
  };
}

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return index === -1 ? [part, ""] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

function getSessionSecret(username = "admin") {
  return process.env.SESSION_SECRET || getAdminPasswordHash(username) || "learn-thai-note-session";
}

function sign(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function createSession(username) {
  const payload = Buffer.from(
    JSON.stringify({
      username,
      exp: Date.now() + sessionMaxAgeSeconds * 1000,
    }),
  ).toString("base64url");
  return `${payload}.${sign(payload, getSessionSecret(username))}`;
}

function verifySession(req) {
  const token = parseCookies(req)[sessionCookieName];
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  let session;
  try {
    session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (session.username !== "admin" || Number(session.exp) < Date.now()) return null;

  const expected = sign(payload, getSessionSecret(session.username));
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  return { username: session.username };
}

function setSessionCookie(res, username) {
  res.cookie(sessionCookieName, createSession(username), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: sessionMaxAgeSeconds * 1000,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(sessionCookieName, { httpOnly: true, sameSite: "lax", path: "/" });
}

function requireAdminPage(req, res, next) {
  const session = verifySession(req);
  if (!session) {
    res.redirect(`/login.html?next=${encodeURIComponent(req.originalUrl || "/admin.html")}`);
    return;
  }
  req.admin = session;
  next();
}

function requireAdminApi(req, res, next) {
  const session = verifySession(req);
  if (!session) {
    res.status(401).json({ error: "请先登录后台。" });
    return;
  }
  req.admin = session;
  next();
}

function sendStaticFile(filename) {
  return (_req, res) => {
    res.sendFile(path.join(__dirname, filename));
  };
}

app.get("/admin.html", requireAdminPage, sendStaticFile("admin.html"));
app.get("/admin.js", requireAdminPage, sendStaticFile("admin.js"));
app.use(
  express.static(__dirname, {
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-store");
      }
    },
    index: "index.html",
  }),
);

app.get("/healthz", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/auth/status", (req, res) => {
  const session = verifySession(req);
  res.json({ authenticated: Boolean(session), username: session?.username || null });
});

app.post("/api/auth/login", (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");

  if (!verifyAdminPassword(username, password)) {
    res.status(401).json({ error: "用户名或密码不正确。" });
    return;
  }

  setSessionCookie(res, username);
  res.json({ ok: true, username });
});

app.post("/api/auth/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.post("/api/auth/change-password", requireAdminApi, (req, res) => {
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");

  if (!verifyAdminPassword(req.admin.username, currentPassword)) {
    res.status(400).json({ error: "当前密码不正确。" });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: "新密码至少需要 6 位。" });
    return;
  }

  updateAdminPassword(req.admin.username, newPassword);
  setSessionCookie(res, req.admin.username);
  res.json({ ok: true });
});

app.get("/api/courses", (_req, res) => {
  res.json(listCourses());
});

app.get("/api/courses/latest", (_req, res) => {
  const course = getLatestCourse();
  if (!course) {
    res.status(404).json({ error: "还没有保存课程。" });
    return;
  }
  res.json(course);
});

app.get("/api/courses/:id", (req, res) => {
  const course = getCourse(Number(req.params.id));
  if (!course) {
    res.status(404).json({ error: "课程不存在。" });
    return;
  }
  res.json(course);
});

app.post("/api/courses", requireAdminApi, (req, res) => {
  try {
    const course = saveCourse(normalizeNote(req.body));
    res.status(201).json(course);
  } catch (error) {
    res.status(400).json({ error: error.message || "保存课程失败。" });
  }
});

app.put("/api/courses/:id", requireAdminApi, (req, res) => {
  try {
    const course = updateCourse(Number(req.params.id), normalizeNote(req.body));
    if (!course) {
      res.status(404).json({ error: "课程不存在。" });
      return;
    }
    res.json(course);
  } catch (error) {
    res.status(400).json({ error: error.message || "更新课程失败。" });
  }
});

app.post("/api/generate-note", requireAdminApi, upload.array("images", 8), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      res.status(500).json({ error: "缺少 OPENAI_API_KEY，请先在 .env 中配置。" });
      return;
    }

    if (!req.files?.length) {
      res.status(400).json({ error: "请上传至少一张包含泰语学习内容的图片。" });
      return;
    }

    const courseName = String(req.body.course || "").trim();
    const imageContents = req.files.map((file) => ({
      type: "input_image",
      image_url: `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
    }));
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  "你是泰语学习笔记整理助手。",
                  "请把多张图片视为同一课程/同一单元的资料，合并去重后整理成适合学习卡片页面渲染的 JSON。",
                  "优先从图片的页眉、标题、单元名或大字标题识别课程名称和主题。",
                  courseName
                    ? `用户补充的课程名称仅作为修正参考，不要覆盖图片中更明确的标题：${courseName}`
                    : "用户没有补充课程名称时，请完全根据图片内容命名课程。",
                  "优先保留图片中已有的中文、英文、泰语和 RTGS 发音。",
                  "如果图片没有英文，可以根据中文和泰语补充简洁英文；如果没有 RTGS，请尽量补充常见拉丁转写。",
                  "vocabulary 放核心词汇，比如国籍、地点、人物、动词、礼貌词等。",
                  "sentences 放图片中出现的句子、对话、替换练习和可直接开口说的例句。",
                  "sentences 的 th 字段必须只放泰文句子或泰文短语，不要放 Males/Females/Hello 等英文说明。",
                  "sentences 的 rtgs 字段只放 th 对应的拉丁发音，不要混入泰文或中文。",
                  "sentences 的 zh 字段放中文意思；如果原图有 Males/Females 等语境，请写成“你好（男性）”这类中文说明。",
                  "grammarNotes 放语法/用法说明，比如男女说话差异、礼貌尾词、句型结构。",
                  "patterns 放容易混淆的词根、句型或高频结构。",
                  "不要按日期组织；按课程、单元、主题组织。",
                ].join("\n"),
              },
              ...imageContents,
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "thai_daily_study_note",
            strict: true,
            schema: noteSchema,
          },
        },
      }),
    });

    const responseJson = await openaiResponse.json();

    if (!openaiResponse.ok) {
      res.status(openaiResponse.status).json({
        error: responseJson.error?.message || "OpenAI API 请求失败。",
      });
      return;
    }

    const outputText = extractOutputText(responseJson);
    const note = JSON.parse(outputText);
    res.json(saveCourse(normalizeNote(note)));
  } catch (error) {
    res.status(500).json({ error: error.message || "生成学习笔记失败。" });
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ error: "图片太大。请压缩后再上传，或选择较少照片。" });
      return;
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      res.status(413).json({ error: "一次最多上传 8 张图片。" });
      return;
    }
  }
  res.status(400).json({ error: error.message || "上传失败。" });
});

const port = Number(process.env.PORT || 5173);
app.listen(port, () => {
  console.log(`LearnThaiNote running at http://localhost:${port}`);
});
