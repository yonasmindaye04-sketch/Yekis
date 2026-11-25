/**
 * Ethiopian (E.C.) calendar helpers for the schedule view, built on **kenat**.
 *
 * `kenat` is the Ethiopian calendar engine (MIT, zero runtime dependencies):
 * it owns the Ethiopic ↔ Gregorian conversion, the 13-month year, the Pagume
 * leap rule and the localized month names. This module wraps it in the shape
 * the dashboard needs:
 *
 *   - plain `YYYY-MM-DD` Gregorian strings, because that is what the schedule
 *     stores and what `<input type="date">` emits;
 *   - Ethiopian fiscal-year arithmetic (Hamle 1 → Sene 30), which kenat does
 *     not model, because the Ethiopian fiscal year is a business concept
 *     rather than a calendar one.
 *
 * A fiscal year is labelled by the E.C. year in which it ends, so EFY 2019 is
 * Hamle 1, 2018 E.C. (8 July 2026) through Sene 30, 2019 (7 July 2027).
 * Fiscal quarters group the twelve regular months three at a time:
 *   Q1 Hamle–Meskerem, Q2 Tikimt–Tahsas, Q3 Tir–Megabit, Q4 Miyazya–Sene.
 * Pagume (the epagomenal days) falls inside Q1 between Nehase and Meskerem,
 * which is why Q1 is the only quarter spanning two E.C. year numbers.
 *
 * Gregorian display strings are formatted with `Intl.DateTimeFormat` in UTC so
 * a calendar date never drifts with the viewer's timezone.
 */

import { monthNames, toEC, toGC } from "kenat";

export interface EthiopianDate {
  year: number;
  month: number; // 1 Meskerem … 13 Pagume
  day: number;
}

export interface EthiopianMonthDefinition {
  number: number;
  name: string;
  amharic: string;
}

export interface EthiopianMonthRange {
  startIso: string;
  endIso: string;
}

export interface FiscalYearInfo {
  fiscalYear: number;
  startIso: string;
  endIso: string;
  label: string;
  gregorianLabel: string;
  rangeLabel: string;
}

export type FiscalQuarter = 1 | 2 | 3 | 4;

export interface FiscalQuarterInfo {
  fiscalYear: number;
  quarter: FiscalQuarter;
  label: string;
  monthLabel: string;
  startIso: string;
  endIso: string;
}

export interface EthiopianCalendarCell {
  dateStr: string;
  day: number;
}

/**
 * Canonical English month names. kenat ships "Miazia" for month 8; the
 * transliteration used across Yekis documentation and Ethiopian business
 * documents is "Miyazya", so the display name is pinned here while the
 * conversion engine, the leap rule and the Amharic names stay with kenat.
 */
const ETHIOPIAN_MONTH_NAMES_EN = [
  "Meskerem",
  "Tikimt",
  "Hidar",
  "Tahsas",
  "Tir",
  "Yekatit",
  "Megabit",
  "Miyazya",
  "Ginbot",
  "Sene",
  "Hamle",
  "Nehase",
  "Pagume",
] as const;

export const ETHIOPIAN_MONTHS: readonly EthiopianMonthDefinition[] =
  ETHIOPIAN_MONTH_NAMES_EN.map((name, index) => ({
    number: index + 1,
    name,
    amharic: monthNames.amharic[index] ?? name,
  }));

const FISCAL_QUARTER_DEFINITIONS: Record<
  FiscalQuarter,
  {
    monthLabel: string;
    startMonth: number;
    endMonth: number;
    startYearOffset: number;
    endYearOffset: number;
  }
> = {
  1: {
    monthLabel: "Hamle–Meskerem",
    startMonth: 11,
    endMonth: 1,
    startYearOffset: -1,
    endYearOffset: 0,
  },
  2: {
    monthLabel: "Tikimt–Tahsas",
    startMonth: 2,
    endMonth: 4,
    startYearOffset: 0,
    endYearOffset: 0,
  },
  3: {
    monthLabel: "Tir–Megabit",
    startMonth: 5,
    endMonth: 7,
    startYearOffset: 0,
    endYearOffset: 0,
  },
  4: {
    monthLabel: "Miyazya–Sene",
    startMonth: 8,
    endMonth: 10,
    startYearOffset: 0,
    endYearOffset: 0,
  },
};

const QUARTER_ORDER: readonly FiscalQuarter[] = [1, 2, 3, 4];

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function isoFromParts(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${pad2(month)}-${pad2(day)}`;
}

function parseIsoDate(iso: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  if (month < 1 || month > 12 || day < 1 || day > daysInMonth) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }

  return { year, month, day };
}

export function getEthiopianMonth(month: number): EthiopianMonthDefinition {
  const definition = ETHIOPIAN_MONTHS.find((entry) => entry.number === month);
  if (!definition) {
    throw new Error(`Invalid Ethiopian month: ${month}`);
  }
  return definition;
}

export function isValidIsoDate(iso: string): boolean {
  try {
    parseIsoDate(iso);
    return true;
  } catch {
    return false;
  }
}

export function getGregorianDateParts(iso: string): {
  year: number;
  month: number;
  day: number;
} {
  return parseIsoDate(iso);
}

export function gregorianToEthiopian(iso: string): EthiopianDate {
  const { year, month, day } = parseIsoDate(iso);
  return toEC(year, month, day);
}

export function ethiopianToGregorian(date: EthiopianDate): string {
  const gregorian = toGC(date.year, date.month, date.day);
  return isoFromParts(gregorian.year, gregorian.month, gregorian.day);
}

/**
 * kenat rejects Pagume 6 in a year that is not a leap year, so the leap rule
 * is read straight from the engine instead of being duplicated here.
 */
export function isEthiopianLeapYear(year: number): boolean {
  try {
    toGC(year, 13, 6);
    return true;
  } catch {
    return false;
  }
}

export function daysInEthiopianMonth(year: number, month: number): number {
  if (month === 13) {
    return isEthiopianLeapYear(year) ? 6 : 5;
  }
  if (month >= 1 && month <= 12) {
    return 30;
  }
  throw new Error(`Invalid Ethiopian month: ${month}`);
}

/** Formats a Gregorian ISO date for display, always in UTC so a date never drifts. */
export function formatGregorianDate(
  iso: string,
  style: "long" | "medium" | "short" | "month-year" = "medium",
): string {
  const { year, month, day } = parseIsoDate(iso);
  const date = new Date(Date.UTC(year, month - 1, day));
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "UTC",
    ...(style === "long"
      ? { month: "long", day: "numeric", year: "numeric" }
      : style === "medium"
        ? { month: "short", day: "numeric", year: "numeric" }
        : style === "short"
          ? { month: "short", day: "numeric" }
          : { month: "long", year: "numeric" }),
  };

  return new Intl.DateTimeFormat("en-US", options).format(date);
}

/** Formats a same-year or cross-year Gregorian span, e.g. "Oct 11 – Nov 9, 2026". */
export function formatGregorianDateRange(
  startIso: string,
  endIso: string,
): string {
  const start = getGregorianDateParts(startIso);
  const end = getGregorianDateParts(endIso);

  if (start.year === end.year) {
    return `${formatGregorianDate(startIso, "short")} – ${formatGregorianDate(endIso, "short")}, ${start.year}`;
  }

  return `${formatGregorianDate(startIso, "medium")} – ${formatGregorianDate(endIso, "medium")}`;
}

export function formatEthiopianDate(
  iso: string,
  style: "short" | "long" = "long",
): string {
  const { year, month, day } = gregorianToEthiopian(iso);
  const { name } = getEthiopianMonth(month);

  return style === "short"
    ? `${name} ${day}`
    : `${name} ${day}, ${year} E.C.`;
}

export function formatEthiopianDateAmharic(iso: string): string {
  const { year, month, day } = gregorianToEthiopian(iso);
  const { amharic } = getEthiopianMonth(month);

  return `${amharic} ${day}, ${year} ዓ.ም.`;
}

export function formatEthiopianMonthYear(
  ethYear: number,
  ethMonth: number,
): string {
  return `${getEthiopianMonth(ethMonth).name} ${ethYear} E.C.`;
}

export function getEthiopianMonthRange(
  ethYear: number,
  ethMonth: number,
): EthiopianMonthRange {
  return {
    startIso: ethiopianToGregorian({ year: ethYear, month: ethMonth, day: 1 }),
    endIso: ethiopianToGregorian({
      year: ethYear,
      month: ethMonth,
      day: daysInEthiopianMonth(ethYear, ethMonth),
    }),
  };
}

/**
 * Builds the Ethiopian month grid with Monday-first weekday alignment. The
 * leading blanks are `null`, matching the shape the Gregorian grid uses.
 */
export function getEthiopianMonthCells(
  ethYear: number,
  ethMonth: number,
): Array<EthiopianCalendarCell | null> {
  const totalDays = daysInEthiopianMonth(ethYear, ethMonth);
  const cells: Array<EthiopianCalendarCell | null> = [];

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push({
      dateStr: ethiopianToGregorian({
        year: ethYear,
        month: ethMonth,
        day,
      }),
      day,
    });
  }

  const firstWeekday = new Date(
    `${cells[0]?.dateStr ?? ""}T00:00:00Z`,
  ).getUTCDay();
  const leadingBlanks = (firstWeekday + 6) % 7;

  return [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...cells,
  ];
}

export function stepEthiopianMonth(
  ethYear: number,
  ethMonth: number,
  delta: -1 | 1,
): { year: number; month: number } {
  let month = ethMonth + delta;
  let year = ethYear;

  while (month > 13) {
    month -= 13;
    year += 1;
  }
  while (month < 1) {
    month += 13;
    year -= 1;
  }

  return { year, month };
}

export function getFiscalYear(dateIso: string): number {
  const { year, month } = gregorianToEthiopian(dateIso);
  return month >= 11 ? year + 1 : year;
}

export function getFiscalYearForEthiopianMonth(
  ethYear: number,
  ethMonth: number,
): number {
  return ethMonth >= 11 ? ethYear + 1 : ethYear;
}

export function getFiscalYearInfo(fiscalYear: number): FiscalYearInfo {
  const startIso = ethiopianToGregorian({
    year: fiscalYear - 1,
    month: 11,
    day: 1,
  });
  const endIso = ethiopianToGregorian({
    year: fiscalYear,
    month: 10,
    day: 30,
  });
  const start = getGregorianDateParts(startIso);
  const end = getGregorianDateParts(endIso);

  return {
    fiscalYear,
    startIso,
    endIso,
    label: `EFY ${fiscalYear} E.C.`,
    gregorianLabel: `${start.year}/${String(end.year).slice(-2)}`,
    rangeLabel: formatGregorianDateRange(startIso, endIso),
  };
}

export function getFiscalQuarterForMonth(ethMonth: number): FiscalQuarter {
  if (ethMonth === 1 || ethMonth >= 11) {
    return 1;
  }
  if (ethMonth <= 4) {
    return 2;
  }
  if (ethMonth <= 7) {
    return 3;
  }
  return 4;
}

export function getFiscalQuarterInfo(
  fiscalYear: number,
  quarter: FiscalQuarter,
): FiscalQuarterInfo {
  const definition = FISCAL_QUARTER_DEFINITIONS[quarter];
  const startYear = fiscalYear + definition.startYearOffset;
  const endYear = fiscalYear + definition.endYearOffset;

  return {
    fiscalYear,
    quarter,
    label: `Q${quarter}`,
    monthLabel: definition.monthLabel,
    startIso: ethiopianToGregorian({
      year: startYear,
      month: definition.startMonth,
      day: 1,
    }),
    endIso: ethiopianToGregorian({
      year: endYear,
      month: definition.endMonth,
      day: daysInEthiopianMonth(endYear, definition.endMonth),
    }),
  };
}

export function getFiscalQuarters(fiscalYear: number): FiscalQuarterInfo[] {
  return QUARTER_ORDER.map((quarter) =>
    getFiscalQuarterInfo(fiscalYear, quarter),
  );
}

export function getFiscalQuarter(dateIso: string): FiscalQuarterInfo {
  const fiscalYear = getFiscalYear(dateIso);
  const { month } = gregorianToEthiopian(dateIso);
  return getFiscalQuarterInfo(fiscalYear, getFiscalQuarterForMonth(month));
}
