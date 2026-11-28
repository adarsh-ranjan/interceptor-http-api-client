/**
 * Generates an RFC 4122 v4 compliant UUID string.
 */
export function generateUuidV4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generates a short random identifier, optionally prefixed.
 */
export function generateId(prefix?: string): string {
  const randomPart = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}-${randomPart}` : randomPart;
}

/**
 * Generates a timestamp-backed identifier, optionally prefixed.
 */
export function generateTimestampId(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}
