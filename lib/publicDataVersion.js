// Preserve sub-second changes, including edits made by older admin clients.
export function publicDataVersion(data) {
  if (!data) return null;
  const stamp = data.updatedAt;
  const revision = data.version ? `${data.version}:` : '';
  if (stamp && typeof stamp === 'object' && stamp.seconds != null) {
    return `${revision}${stamp.seconds}:${stamp.nanoseconds || 0}`;
  }
  return stamp ? `${revision}${stamp}` : (data.version || null);
}
