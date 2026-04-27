export function getScheduleEndDate(schedule) {
  if (!schedule?.date) {
    return null;
  }

  const endTime = schedule.endTime || schedule.startTime;

  if (!endTime) {
    return null;
  }

  const endDate = new Date(`${schedule.date}T${endTime}`);

  if (Number.isNaN(endDate.getTime())) {
    return null;
  }

  if (schedule.endTime && schedule.startTime && schedule.endTime < schedule.startTime) {
    endDate.setDate(endDate.getDate() + 1);
  }

  return endDate;
}

export function isScheduleClosed(schedule, now = new Date()) {
  const endDate = getScheduleEndDate(schedule);

  return Boolean(endDate && endDate < now);
}
