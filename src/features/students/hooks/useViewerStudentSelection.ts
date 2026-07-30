import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "edumatrix.viewer.selectedStudentId";

export function useViewerStudentSelection(students: { id: string }[]) {
  const [selectedStudentId, setSelectedStudentId] = useState(() => readStoredStudentId());

  useEffect(() => {
    if (students.length === 0 || students.some((student) => student.id === selectedStudentId)) return;
    const fallbackId = students[0].id;
    setSelectedStudentId(fallbackId);
    storeStudentId(fallbackId);
  }, [selectedStudentId, students]);

  const selectStudent = useCallback((studentId: string) => {
    setSelectedStudentId(studentId);
    storeStudentId(studentId);
  }, []);

  return { selectedStudentId, selectStudent };
}

function readStoredStudentId(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function storeStudentId(studentId: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, studentId);
  } catch {
    // Trình duyệt có thể chặn storage; lựa chọn vẫn hoạt động trong phiên React hiện tại.
  }
}
