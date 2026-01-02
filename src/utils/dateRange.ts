import { DateTime } from "luxon";

export function parseDateRange(
  weekStr: string
): { start: Date; end: Date | null } | null {
  try {
    weekStr = weekStr.trim().replace(/\s*--+$/, "");
    const currentYear = new Date().getFullYear();
    const zone = "Asia/Jakarta";

    // Format: "April 12 - May 18, 2025"
    const fullRangeMatch = weekStr.match(
      /^([A-Za-z]+)\s+(\d{1,2})\s*-\s*([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/
    );
    if (fullRangeMatch) {
      const [, startMonthStr, startDayStr, endMonthStr, endDayStr, yearStr] =
        fullRangeMatch;
      const year = parseInt(yearStr);

      const start = DateTime.fromFormat(
        `${startMonthStr} ${startDayStr} ${year}`,
        "LLLL d yyyy",
        { zone }
      );
      const end = DateTime.fromFormat(
        `${endMonthStr} ${endDayStr} ${year}`,
        "LLLL d yyyy",
        { zone }
      );

      if (!start.isValid || !end.isValid) return null;

      return {
        start: start.toJSDate(),
        end: end.toJSDate(),
      };
    }

    // Format: "April 23, 2025"
    const fullSingleDateMatch = weekStr.match(
      /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/
    );
    if (fullSingleDateMatch) {
      const [, monthStr, dayStr, yearStr] = fullSingleDateMatch;

      const date = DateTime.fromFormat(
        `${monthStr} ${dayStr} ${yearStr}`,
        "LLLL d yyyy",
        { zone }
      );

      if (!date.isValid) return null;

      return {
        start: date.toJSDate(),
        end: null,
      };
    }

    // Format: "April 1-7" (assumes current year)
    const rangeMatch = weekStr.match(/^([A-Za-z]+)\s+(\d{1,2})-(\d{1,2})$/);
    if (rangeMatch) {
      const [, monthStr, startDayStr, endDayStr] = rangeMatch;

      const start = DateTime.fromFormat(
        `${monthStr} ${startDayStr} ${currentYear}`,
        "LLLL d yyyy",
        { zone }
      );
      const end = DateTime.fromFormat(
        `${monthStr} ${endDayStr} ${currentYear}`,
        "LLLL d yyyy",
        { zone }
      );

      if (!start.isValid || !end.isValid) return null;

      return {
        start: start.toJSDate(),
        end: end.toJSDate(),
      };
    }

    // Format: "January 2" (assumes current year)
    const singleDateMatch = weekStr.match(/^([A-Za-z]+)\s+(\d{1,2})$/);
    if (singleDateMatch) {
      const [, monthStr, dayStr] = singleDateMatch;

      const date = DateTime.fromFormat(
        `${monthStr} ${dayStr} ${currentYear}`,
        "LLLL d yyyy",
        { zone }
      );

      if (!date.isValid) return null;

      return {
        start: date.toJSDate(),
        end: null,
      };
    }

    // Format: "April" (only month)
    const monthOnlyMatch = weekStr.match(/^[A-Za-z]+$/);
    if (monthOnlyMatch) {
      const monthStr = weekStr.trim();
      const start = DateTime.fromFormat(
        `${monthStr} 1 ${currentYear}`,
        "LLLL d yyyy",
        { zone }
      );

      if (!start.isValid) return null;

      const end = start.endOf("month");

      return {
        start: start.toJSDate(),
        end: end.toJSDate(),
      };
    }

    // Format: "2025" (whole year)
    if (/^\d{4}$/.test(weekStr)) {
      const year = parseInt(weekStr);
      const start = DateTime.fromObject({ year, month: 1, day: 1 }, { zone });
      const end = DateTime.fromObject({ year, month: 12, day: 31 }, { zone });

      return {
        start: start.toJSDate(),
        end: end.toJSDate(),
      };
    }

    // Unknown format
    return null;
  } catch (error) {
    console.error("Error parsing date range:", error);
    return null;
  }
}
