export function userPartitionKey(userId: string): string {
  return `USER#${userId}`;
}

export function goalSortKey(goalId: string): string {
  return `GOAL#${goalId}`;
}

export function taskSortKey(taskId: string): string {
  return `TASK#${taskId}`;
}

export function documentSortKey(documentId: string): string {
  return `DOC#${documentId}`;
}

export function habitSortKey(habitId: string): string {
  return `HABIT#${habitId}`;
}

export function habitLogSortKey(
  habitId: string,
  date: string,
): string {
  return `HABITLOG#${habitId}#${date}`;
}