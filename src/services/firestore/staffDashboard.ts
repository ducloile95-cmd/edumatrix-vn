import { eachDayOfInterval, format, isSameDay, subDays } from "date-fns";
import { listAssignments, listAssignmentSummariesByIds, listSubmissionsByStudents } from "@/services/firestore/assignments";
import { listAttendanceBySessionIds, listAttendanceSummariesBySessionIds, listSessionsWithoutAttendance, listUpcomingRegisteredLeaves } from "@/services/firestore/attendance";
import { listClasses } from "@/services/firestore/classes";
import { listUpcomingSessionsWithoutLessonPlan } from "@/services/firestore/lessonPlans";
import { listScoresByClass } from "@/services/firestore/scores";
import { listSessions } from "@/services/firestore/sessions";
import { listStudents } from "@/services/firestore/students";
import type { AcademicRank, RankThresholds } from "@/utils/ranking";
import { rankFromPercent } from "@/utils/ranking";
import { safePercent, studentRiskReasons } from "@/utils/dashboardMetrics";

export interface DashboardRange { days: 7 | 30 | 90; from: Date; to: Date }
export interface DashboardFilters { classId?: string; courseId?: string; teacherId?: string }

export interface DashboardSession {
  id: string;
  className: string;
  title: string;
  location: string;
  startAt: Date;
  studentCount: number;
  status: string;
}

export interface DashboardAction { id: string; count: number; label: string; detail: string; kind: "attendance" | "grading" | "homework" | "leave" | "lesson" }

interface DashboardBase {
  today: { total: number; done: number; upcoming: number };
  activeClasses: number;
  activeStudents: number;
  absentLateToday: number;
  ungraded: number;
  attendanceGaps: number;
  lessonPlanGaps: number;
  sessions: DashboardSession[];
  actions: DashboardAction[];
}

export interface AdminDashboardData extends DashboardBase { role: "admin" }
export interface TeacherDashboardData extends DashboardBase { role: "teacher" }

export interface DashboardLearningData {
  attendanceRate: number;
  assignmentRate: number;
  averageScore: number;
  attendanceTrend: { date: string; rate: number }[];
  classMetrics: { classId: string; className: string; attendance: number; assignments: number; averageScore: number }[];
  rankDistribution: { rank: AcademicRank; count: number }[];
  atRiskStudents: { id: string; name: string; classNames: string[]; rank: AcademicRank | null; reasons: string[] }[];
  studentInsights: { id: string; name: string; classNames: string[]; attendanceRate: number; assignmentRate: number; scoreTrend: number[]; redoCount: number; latestComment: string; rank: AcademicRank | null }[];
}

export function dashboardRange(days: 7 | 30 | 90, now = new Date()): DashboardRange {
  return { days, from: subDays(now, days - 1), to: now };
}

function startOfDay(date: Date): Date { const value = new Date(date); value.setHours(0, 0, 0, 0); return value; }
function endOfDay(date: Date): Date { const value = new Date(date); value.setHours(23, 59, 59, 999); return value; }

async function scopedContext(filters: DashboardFilters) {
  const [classes, students] = await Promise.all([listClasses(), listStudents()]);
  const scopedClasses = classes.filter((klass) =>
    (!filters.classId || klass.id === filters.classId) &&
    (!filters.courseId || klass.courseId === filters.courseId) &&
    (!filters.teacherId || klass.teacherIds.includes(filters.teacherId)),
  );
  const classIds = new Set(scopedClasses.map((klass) => klass.id));
  const studentIds = new Set(scopedClasses.flatMap((klass) => klass.studentIds));
  return {
    classes: scopedClasses,
    students: students.filter((student) => studentIds.has(student.id) && student.status === "active"),
    classIds,
  };
}

async function getDashboardBase(filters: DashboardFilters, now = new Date()): Promise<DashboardBase> {
  const context = await scopedContext(filters);
  const todaySessions = (await listSessions(startOfDay(now), endOfDay(now))).filter((session) => context.classIds.has(session.classId) && session.status !== "cancelled");
  const [assignments, attendanceSummaries, attendanceGapsAll, lessonPlanGaps, leaves] = await Promise.all([
    listAssignments(),
    listAttendanceSummariesBySessionIds(todaySessions.map((session) => session.id)),
    listSessionsWithoutAttendance(14),
    listUpcomingSessionsWithoutLessonPlan([...context.classIds], 7),
    listUpcomingRegisteredLeaves(14),
  ]);
  const scopedAssignments = assignments.filter((assignment) => context.classIds.has(assignment.classId));
  const [assignmentSummaries, submissions] = await Promise.all([
    listAssignmentSummariesByIds(scopedAssignments.map((assignment) => assignment.id)),
    listSubmissionsByStudents(context.students.map((student) => student.id)),
  ]);
  // submittedCount tren assignment_summaries khong duoc cap nhat khi hoc sinh nop bai (Rules
  // chi cho phep giao vien/admin ghi doc nay), nen dem truc tiep tu submissions/ de ra so dung.
  const submittedCountByAssignment = new Map<string, number>();
  submissions.forEach((submission) => {
    submittedCountByAssignment.set(submission.assignmentId, (submittedCountByAssignment.get(submission.assignmentId) ?? 0) + 1);
  });
  const ungraded = assignmentSummaries.reduce((sum, item) => sum + Math.max(0, (submittedCountByAssignment.get(item.assignmentId) ?? 0) - item.gradedCount), 0);
  const classById = new Map(context.classes.map((klass) => [klass.id, klass]));
  const upcoming = todaySessions.filter((session) => session.endAt.toMillis() >= now.getTime());
  const attendanceGaps = attendanceGapsAll.filter((session) => context.classIds.has(session.classId));
  const scopedLeaves = leaves.filter((leave) => context.classIds.has(leave.classId));
  const missingSubmissions = assignmentSummaries.reduce((sum, item) => sum + Math.max(0, item.totalStudents - (submittedCountByAssignment.get(item.assignmentId) ?? 0)), 0);
  const actions = ([
    { id: "attendance", count: attendanceGaps.length, label: "Buổi chưa điểm danh đủ", detail: "Hoàn tất điểm danh các buổi đã kết thúc", kind: "attendance" },
    { id: "grading", count: ungraded, label: "Bài đang chờ chấm", detail: "Học sinh đã nộp và chưa có kết quả", kind: "grading" },
    { id: "homework", count: missingSubmissions, label: "Bài cần nhắc nộp", detail: "Bài đã giao nhưng chưa được nộp", kind: "homework" },
    { id: "leave", count: scopedLeaves.length, label: "Đăng ký nghỉ sắp tới", detail: "Đơn nghỉ trong 14 ngày tới", kind: "leave" },
    { id: "lesson", count: lessonPlanGaps.length, label: "Buổi chưa có giáo án", detail: "Lịch học trong 7 ngày tới", kind: "lesson" },
  ] satisfies DashboardAction[]).filter((item) => item.count > 0);
  return {
    today: { total: todaySessions.length, done: todaySessions.length - upcoming.length, upcoming: upcoming.length },
    activeClasses: context.classes.filter((klass) => klass.status === "active").length,
    activeStudents: context.students.length,
    absentLateToday: attendanceSummaries.reduce((sum, item) => sum + item.absent + item.late, 0),
    ungraded,
    attendanceGaps: attendanceGaps.length,
    lessonPlanGaps: lessonPlanGaps.length,
    sessions: todaySessions.sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis()).map((session) => ({
      id: session.id,
      className: classById.get(session.classId)?.name ?? "Lớp học",
      title: session.title,
      location: session.location,
      startAt: session.startAt.toDate(),
      studentCount: classById.get(session.classId)?.studentIds.length ?? 0,
      status: session.status,
    })),
    actions,
  };
}

export async function getAdminDashboard(_range: DashboardRange, filters: DashboardFilters): Promise<AdminDashboardData> {
  return { ...(await getDashboardBase(filters)), role: "admin" };
}

export async function getTeacherDashboard(_uid: string, _range: DashboardRange, filters: DashboardFilters): Promise<TeacherDashboardData> {
  return { ...(await getDashboardBase(filters)), role: "teacher" };
}

function maxConsecutiveAbsences(statuses: string[]): number {
  let current = 0; let maximum = 0;
  statuses.forEach((status) => { current = status === "absent" ? current + 1 : 0; maximum = Math.max(maximum, current); });
  return maximum;
}

export async function getDashboardLearning(range: DashboardRange, filters: DashboardFilters, thresholds: RankThresholds): Promise<DashboardLearningData> {
  const context = await scopedContext(filters);
  const [sessions, assignments] = await Promise.all([
    listSessions(startOfDay(range.from), endOfDay(range.to)),
    listAssignments(),
  ]);
  const scopedSessions = sessions.filter((session) => context.classIds.has(session.classId) && session.status !== "cancelled");
  const scopedAssignments = assignments.filter((assignment) => context.classIds.has(assignment.classId));
  const [attendance, summaries, submissions, scoreGroups] = await Promise.all([
    listAttendanceBySessionIds(scopedSessions.map((session) => session.id)),
    listAttendanceSummariesBySessionIds(scopedSessions.map((session) => session.id)),
    listSubmissionsByStudents(context.students.map((student) => student.id)),
    Promise.all(context.classes.map((klass) => listScoresByClass(klass.id))),
  ]);
  const scores = scoreGroups.flat().filter((score) => context.classIds.has(score.classId));
  const classById = new Map(context.classes.map((klass) => [klass.id, klass]));
  const sessionById = new Map(scopedSessions.map((session) => [session.id, session]));
  const attendanceTrend = eachDayOfInterval({ start: range.from, end: range.to }).map((day) => {
    const daySummaries = summaries.filter((summary) => { const session = sessionById.get(summary.sessionId); return session && isSameDay(session.startAt.toDate(), day); });
    return { date: format(day, "dd/MM"), rate: safePercent(daySummaries.reduce((sum, item) => sum + item.present, 0), daySummaries.reduce((sum, item) => sum + item.total, 0)) };
  });
  const submissionKeys = new Set(submissions.map((submission) => `${submission.assignmentId}:${submission.studentId}`));
  const scorePercent = (score: typeof scores[number]) => score.maxScore > 0 ? (score.score / score.maxScore) * 100 : 0;
  const classMetrics = context.classes.map((klass) => {
    const classSummaries = summaries.filter((summary) => summary.classId === klass.id);
    const classAssignments = scopedAssignments.filter((assignment) => assignment.classId === klass.id);
    const expected = classAssignments.length * klass.studentIds.length;
    const submitted = classAssignments.reduce((count, assignment) => count + klass.studentIds.filter((studentId) => submissionKeys.has(`${assignment.id}:${studentId}`)).length, 0);
    const classScores = scores.filter((score) => score.classId === klass.id).map(scorePercent);
    return { classId: klass.id, className: klass.name, attendance: safePercent(classSummaries.reduce((sum, item) => sum + item.present, 0), classSummaries.reduce((sum, item) => sum + item.total, 0)), assignments: safePercent(submitted, expected), averageScore: classScores.length ? Math.round(classScores.reduce((sum, value) => sum + value, 0) / classScores.length) : 0 };
  });
  const studentRows = context.students.map((student) => {
    const studentAttendance = attendance.filter((item) => item.studentId === student.id).sort((a, b) => a.markedAt.toMillis() - b.markedAt.toMillis());
    const studentAssignments = scopedAssignments.filter((assignment) => student.currentClassIds.includes(assignment.classId));
    const studentScores = scores.filter((score) => score.studentId === student.id).sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis()).map(scorePercent);
    const average = studentScores.length ? Math.round(studentScores.reduce((sum, value) => sum + value, 0) / studentScores.length) : null;
    const rank = rankFromPercent(average, thresholds);
    const attendanceRate = safePercent(studentAttendance.filter((item) => item.status === "present").length, studentAttendance.length);
    const assignmentRate = safePercent(studentAssignments.filter((assignment) => submissionKeys.has(`${assignment.id}:${student.id}`)).length, studentAssignments.length);
    const studentSubmissions = submissions.filter((submission) => submission.studentId === student.id).sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis());
    return { student, rank, average, attendanceRate, assignmentRate, studentScores, redoCount: studentSubmissions.filter((submission) => submission.status === "redo_required").length, latestComment: studentSubmissions.find((submission) => submission.teacherComment.trim())?.teacherComment ?? "", reasons: studentRiskReasons({ attendanceRate, attendanceTotal: studentAttendance.length, consecutiveAbsences: maxConsecutiveAbsences(studentAttendance.map((item) => item.status)), assignmentRate, assignmentTotal: studentAssignments.length, recentScores: studentScores, rank }) };
  });
  const allScorePercentages = scores.map(scorePercent);
  return {
    attendanceRate: safePercent(summaries.reduce((sum, item) => sum + item.present, 0), summaries.reduce((sum, item) => sum + item.total, 0)),
    assignmentRate: classMetrics.length ? Math.round(classMetrics.reduce((sum, item) => sum + item.assignments, 0) / classMetrics.length) : 0,
    averageScore: allScorePercentages.length ? Math.round(allScorePercentages.reduce((sum, value) => sum + value, 0) / allScorePercentages.length) : 0,
    attendanceTrend,
    classMetrics,
    rankDistribution: (["S", "A", "B", "D"] as AcademicRank[]).map((rank) => ({ rank, count: studentRows.filter((row) => row.rank === rank).length })),
    atRiskStudents: studentRows.filter((row) => row.reasons.length > 0).map((row) => ({ id: row.student.id, name: row.student.fullName, classNames: row.student.currentClassIds.map((id) => classById.get(id)?.name).filter((name): name is string => !!name), rank: row.rank, reasons: row.reasons })),
    studentInsights: studentRows.map((row) => ({ id: row.student.id, name: row.student.fullName, classNames: row.student.currentClassIds.map((id) => classById.get(id)?.name).filter((name): name is string => !!name), attendanceRate: row.attendanceRate, assignmentRate: row.assignmentRate, scoreTrend: row.studentScores.slice(-3).map(Math.round), redoCount: row.redoCount, latestComment: row.latestComment, rank: row.rank })),
  };
}
