export function assertQuestionAnswerable(room: {
  status: string;
  currentQuestionId: string | null;
  currentQuestionStartedAt: Date | null;
  currentQuestionEndsAt: Date | null;
}, questionId: string, now = new Date()) {
  if (room.status !== "active") throw new Error("Room is not accepting answers.");
  if (!room.currentQuestionId || room.currentQuestionId !== questionId) {
    throw new Error("This question is not currently active.");
  }
  if (!room.currentQuestionStartedAt || !room.currentQuestionEndsAt) {
    throw new Error("Question timer has not started.");
  }
  if (now > room.currentQuestionEndsAt) {
    throw new Error("Time is over for this question.");
  }
}

export function buildQuestionWindow(seconds: number, now = new Date()) {
  return {
    startedAt: now,
    endsAt: new Date(now.getTime() + seconds * 1000)
  };
}

