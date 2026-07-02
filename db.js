import { DatabaseSync } from "node:sqlite";
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
`);

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
