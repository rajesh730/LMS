function getItemTime(item, getTime) {
  const value = getTime(item);
  const time = value ? new Date(value).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

export function diversifyBySchool(items, { limit, getSchoolKey, getTime }) {
  const pageLimit = Math.max(Number(limit) || items.length, 0);
  if (!Array.isArray(items) || pageLimit === 0) return [];

  const groups = new Map();
  const fallbackItems = [];

  [...items]
    .sort((a, b) => getItemTime(b, getTime) - getItemTime(a, getTime))
    .forEach((item) => {
      const schoolKey = String(getSchoolKey(item) || "").trim();
      if (!schoolKey) {
        fallbackItems.push(item);
        return;
      }

      const group = groups.get(schoolKey) || [];
      group.push(item);
      groups.set(schoolKey, group);
    });

  const schoolQueues = [...groups.values()].sort(
    (a, b) => getItemTime(b[0], getTime) - getItemTime(a[0], getTime)
  );
  const diversified = [];

  while (diversified.length < pageLimit && schoolQueues.length > 0) {
    for (let index = 0; index < schoolQueues.length; index += 1) {
      const queue = schoolQueues[index];
      const nextItem = queue.shift();

      if (nextItem) diversified.push(nextItem);
      if (diversified.length >= pageLimit) break;
    }

    for (let index = schoolQueues.length - 1; index >= 0; index -= 1) {
      if (schoolQueues[index].length === 0) schoolQueues.splice(index, 1);
    }

    schoolQueues.sort(
      (a, b) => getItemTime(b[0], getTime) - getItemTime(a[0], getTime)
    );
  }

  if (diversified.length < pageLimit) {
    diversified.push(...fallbackItems.slice(0, pageLimit - diversified.length));
  }

  return diversified.slice(0, pageLimit);
}
