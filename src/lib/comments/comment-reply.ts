export function getCommentReplyError(content: string): string | null {
  const trimmed = content.trim();

  if (!trimmed) {
    return "Please enter a reply.";
  }

  if (trimmed.length > 500) {
    return "Reply must be 500 characters or fewer.";
  }

  return null;
}
