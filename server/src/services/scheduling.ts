export type BusySlot = { start: Date; end: Date };
export type WorkItem = { id: string; title: string; minutes: number; priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'; dueAt?: Date | null };

export function hasScheduleConflict(start: Date, end: Date, busy: BusySlot[]): boolean {
  return end <= start || busy.some((slot) => start < slot.end && end > slot.start);
}

function findSlot(occupied: BusySlot[], durationMinutes: number, now: Date, dayEnd: Date): Date | undefined {
  let cursor = new Date(now);
  const durationMs = durationMinutes * 60_000;
  for (const slot of occupied) {
    if (slot.end <= cursor) continue;
    if (slot.start > cursor) {
      const gap = slot.start.getTime() - cursor.getTime();
      if (gap >= durationMs && cursor.getTime() + durationMs <= dayEnd.getTime()) {
        return new Date(cursor);
      }
    }
    if (slot.end > cursor) {
      cursor = new Date(slot.end);
    }
    if (cursor.getTime() >= dayEnd.getTime()) break;
  }
  if (cursor.getTime() + durationMs <= dayEnd.getTime()) {
    return new Date(cursor);
  }
  return undefined;
}

export function suggestSlots(items: WorkItem[], busy: BusySlot[], now: Date, dayEnd: Date) {
  const occupied = [...busy].sort((a, b) => a.start.getTime() - b.start.getTime());
  const priorityRank = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const ordered = [...items].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity));
  const suggestions: Array<{ item: WorkItem; start: Date; minutes: number; reason: string }> = [];

  for (const item of ordered) {
    let minutes = Math.max(5, item.minutes);
    let start = findSlot(occupied, minutes, now, dayEnd);

    if (!start && minutes > 15) {
      minutes = 15;
      start = findSlot(occupied, minutes, now, dayEnd);
    }

    if (!start) continue;

    const compact = minutes < item.minutes;
    suggestions.push({
      item,
      start,
      minutes,
      reason: compact
        ? `Your remaining time is tight, so this is a ${minutes}-minute version of a ${item.minutes}-minute activity.`
        : `${item.priority.toLowerCase()} priority and the next available ${minutes}-minute opening.`,
    });

    const nextBusy = { start, end: new Date(start.getTime() + minutes * 60_000) };
    occupied.push(nextBusy);
    occupied.sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  return suggestions;
}
