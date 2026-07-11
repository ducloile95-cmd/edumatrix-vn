export function stableDocumentId(parts: string[]): string {
  return parts.join("_").replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 140);
}

export function chunk<T>(items: T[], size: number): T[][] {
  if (!Number.isInteger(size) || size <= 0) throw new Error("CHUNK_SIZE_INVALID");
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}
