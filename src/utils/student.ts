/**
 * Nhan hien thi cua hoc sinh. Chi mot cho duy nhat quyet dinh cach ghep biet danh,
 * de khong rai logic ra 22 file dang dung fullName.
 */
export function studentLabel(student: { fullName: string; nickname?: string }): string {
  const nickname = student.nickname?.trim();
  return nickname ? `${student.fullName} (${nickname})` : student.fullName;
}
