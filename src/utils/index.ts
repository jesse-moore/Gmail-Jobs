
export const getFormattedDate = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const year = date.getFullYear();
  const month = `0${date.getMonth() + 1}`.slice(-2); // months are 0-based
  const day = `0${date.getDate()}`.slice(-2);
  return `${year}/${month}/${day}`;
};
