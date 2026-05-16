/**
 * Blob ma'lumotini brauzerda fayl sifatida yuklab oladi.
 * Server tomonidan kelgan Content-Disposition header'iga ham mos.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/**
 * Axios javobidan Content-Disposition header'idan fayl nomini ajratib oladi.
 */
export function extractFileName(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) return fallback;
  const match = /filename="?([^";]+)"?/i.exec(contentDisposition);
  return match?.[1] ?? fallback;
}
