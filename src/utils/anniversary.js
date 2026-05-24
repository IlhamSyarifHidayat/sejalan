export function formatAnniversaryDate(dateString) {
  if (!dateString) return "Belum diatur";

  const [year, month, day] = dateString.split("-");

  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  );

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function calculateRelationshipDuration(dateString) {
  if (!dateString) return "Belum diatur";

  const [year, month, day] = dateString.split("-");

  const start = new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  );

  const now = new Date();

  // kalau belum mulai / tanggal invalid
  if (isNaN(start.getTime())) return "Belum diatur";

  // kalau tanggal di masa depan
  if (start > now) {
    return "0th 0bln 0h";
  }

  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();

  // koreksi hari
  if (days < 0) {
    const prevMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0
    );

    days += prevMonth.getDate();
    months--;
  }

  // koreksi bulan
  if (months < 0) {
    months += 12;
    years--;
  }

  return `${years}th ${months}bln ${days}h`;
}