import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = process.env.DATA_DIR || path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, "learn-thai-note.sqlite"));

db.exec(`
  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    course TEXT NOT NULL,
    lesson TEXT NOT NULL,
    topic TEXT NOT NULL,
    vocabulary_json TEXT NOT NULL,
    patterns_json TEXT NOT NULL,
    sentences_json TEXT NOT NULL,
    grammar_notes_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_courses_updated_at ON courses(updated_at DESC);

  CREATE TABLE IF NOT EXISTS admin_users (
    username TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const passwordIterations = 210000;
const passwordKeyLength = 32;
const passwordDigest = "sha256";

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, passwordIterations, passwordKeyLength, passwordDigest).toString("hex");
  return `pbkdf2$${passwordIterations}$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  const [scheme, iterations, salt, hash] = String(storedHash || "").split("$");
  if (scheme !== "pbkdf2" || !iterations || !salt || !hash) return false;

  try {
    const hashBuffer = Buffer.from(hash, "hex");
    if (!hashBuffer.length) return false;

    const candidate = crypto
      .pbkdf2Sync(password, salt, Number(iterations), hashBuffer.length, passwordDigest)
      .toString("hex");

    return crypto.timingSafeEqual(Buffer.from(candidate, "hex"), hashBuffer);
  } catch {
    return false;
  }
}

function ensureDefaultAdmin() {
  const existing = db.prepare("SELECT username FROM admin_users WHERE username = ?").get("admin");
  if (existing) return;

  db.prepare("INSERT INTO admin_users (username, password_hash) VALUES (?, ?)").run("admin", hashPassword("admin"));
}

ensureDefaultAdmin();

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function rowToCourse(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    course: row.course,
    lesson: row.lesson,
    topic: row.topic,
    vocabulary: parseJson(row.vocabulary_json, []),
    patterns: parseJson(row.patterns_json, []),
    sentences: parseJson(row.sentences_json, []),
    grammarNotes: parseJson(row.grammar_notes_json, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function saveCourse(note) {
  const statement = db.prepare(`
    INSERT INTO courses (
      title,
      course,
      lesson,
      topic,
      vocabulary_json,
      patterns_json,
      sentences_json,
      grammar_notes_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = statement.run(
    note.title,
    note.course,
    note.lesson,
    note.topic,
    JSON.stringify(note.vocabulary),
    JSON.stringify(note.patterns),
    JSON.stringify(note.sentences),
    JSON.stringify(note.grammarNotes),
  );

  return getCourse(Number(result.lastInsertRowid));
}

export function updateCourse(id, note) {
  const statement = db.prepare(`
    UPDATE courses
    SET
      title = ?,
      course = ?,
      lesson = ?,
      topic = ?,
      vocabulary_json = ?,
      patterns_json = ?,
      sentences_json = ?,
      grammar_notes_json = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const result = statement.run(
    note.title,
    note.course,
    note.lesson,
    note.topic,
    JSON.stringify(note.vocabulary),
    JSON.stringify(note.patterns),
    JSON.stringify(note.sentences),
    JSON.stringify(note.grammarNotes),
    id,
  );

  if (result.changes === 0) return null;
  return getCourse(id);
}

export function listCourses() {
  const rows = db
    .prepare(
      `
        SELECT
          id,
          title,
          course,
          lesson,
          topic,
          vocabulary_json,
          patterns_json,
          sentences_json,
          grammar_notes_json,
          created_at,
          updated_at
        FROM courses
        ORDER BY updated_at DESC, id DESC
      `,
    )
    .all();
  return rows.map(rowToCourse);
}

export function getLatestCourse() {
  const row = db
    .prepare(
      `
        SELECT
          id,
          title,
          course,
          lesson,
          topic,
          vocabulary_json,
          patterns_json,
          sentences_json,
          grammar_notes_json,
          created_at,
          updated_at
        FROM courses
        ORDER BY updated_at DESC, id DESC
        LIMIT 1
      `,
    )
    .get();
  return rowToCourse(row);
}

export function getCourse(id) {
  const row = db
    .prepare(
      `
        SELECT
          id,
          title,
          course,
          lesson,
          topic,
          vocabulary_json,
          patterns_json,
          sentences_json,
          grammar_notes_json,
          created_at,
          updated_at
        FROM courses
        WHERE id = ?
      `,
    )
    .get(id);
  return rowToCourse(row);
}

export function getAdminPasswordHash(username = "admin") {
  const row = db.prepare("SELECT password_hash FROM admin_users WHERE username = ?").get(username);
  return row?.password_hash || "";
}

export function verifyAdminPassword(username, password) {
  const row = db.prepare("SELECT password_hash FROM admin_users WHERE username = ?").get(username);
  if (!row) return false;
  return verifyPassword(password, row.password_hash);
}

export function updateAdminPassword(username, password) {
  const result = db
    .prepare("UPDATE admin_users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?")
    .run(hashPassword(password), username);
  return result.changes > 0;
}
