import type {
  ClassDoc,
  CourseCurriculumDoc,
  CourseCurriculumItemDoc,
  SessionDoc,
  StudentDoc,
} from "@/types/academic";
import type { UserDoc } from "@/types/user";

type UnknownRecord = Record<string, unknown>;

function record(value: unknown, path: string): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(path);
  return value as UnknownRecord;
}

function fail(path: string): never {
  throw new Error(`INVALID_FIRESTORE_DOCUMENT:${path}`);
}

function string(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string") fail(path);
}

function number(value: unknown, path: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) fail(path);
}

function stringArray(value: unknown, path: string): asserts value is string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) fail(path);
}

export function decodeUserDoc(value: unknown, path: string): UserDoc {
  const data = record(value, path);
  string(data.email, path);
  string(data.displayName, path);
  if (!(["admin", "teacher", "viewer"] as unknown[]).includes(data.role)) fail(path);
  if (!(["active", "disabled"] as unknown[]).includes(data.status)) fail(path);
  stringArray(data.studentIds, path);
  if (data.photoURL !== null && typeof data.photoURL !== "string") fail(path);
  return value as UserDoc;
}

export function decodeStudentDoc(value: unknown, path: string): StudentDoc {
  const data = record(value, path);
  string(data.studentCode, path);
  string(data.fullName, path);
  string(data.dateOfBirth, path);
  stringArray(data.parentUids, path);
  stringArray(data.currentClassIds, path);
  stringArray(data.teacherIds, path);
  if (data.status !== "active" && data.status !== "inactive") fail(path);
  return value as StudentDoc;
}

export function decodeClassDoc(value: unknown, path: string): ClassDoc {
  const data = record(value, path);
  string(data.name, path);
  string(data.courseId, path);
  stringArray(data.subjectIds, path);
  stringArray(data.teacherIds, path);
  stringArray(data.studentIds, path);
  if (!(["active", "completed", "cancelled"] as unknown[]).includes(data.status)) fail(path);
  return value as ClassDoc;
}

export function decodeSessionDoc(value: unknown, path: string): SessionDoc {
  const data = record(value, path);
  string(data.classId, path);
  string(data.title, path);
  if (!data.startAt || !data.endAt) fail(path);
  if (!(["scheduled", "rescheduled", "cancelled", "completed"] as unknown[]).includes(data.status)) fail(path);
  return value as SessionDoc;
}

export function decodeCourseCurriculumDoc(value: unknown, path: string): CourseCurriculumDoc {
  const data = record(value, path);
  string(data.courseId, path);
  number(data.version, path);
  stringArray(data.itemIds, path);
  number(data.itemCount, path);
  if (!(["draft", "published", "superseded", "archived"] as unknown[]).includes(data.status)) fail(path);
  return value as CourseCurriculumDoc;
}

export function decodeCourseCurriculumItemDoc(value: unknown, path: string): CourseCurriculumItemDoc {
  const data = record(value, path);
  string(data.courseId, path);
  number(data.curriculumVersion, path);
  number(data.sequenceNumber, path);
  string(data.subjectId, path);
  string(data.title, path);
  return value as CourseCurriculumItemDoc;
}
