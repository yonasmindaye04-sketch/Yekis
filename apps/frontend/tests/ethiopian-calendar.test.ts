import { describe, expect, it } from "vitest";
import {
  ethiopianToGregorian,
  formatEthiopianDate,
  getEthiopianMonthCells,
  getEthiopianMonthRange,
  getFiscalQuarter,
  getFiscalQuarters,
  getFiscalYear,
  getFiscalYearInfo,
  gregorianToEthiopian,
} from "../src/lib/ethiopianCalendar";
import { getTodayAddisIso } from "../src/components/dashboard/dashboardData";

describe("Ethiopian calendar & fiscal arithmetic (Decision 12)", () => {
  it("converts Meskerem 1 as Sep 11 in normal years and Sep 12 in Gregorian leap-adjacent years", () => {
    // 2018 E.C. begins on 2025-09-11 (2017 E.C. Pagume has 5 days)
    expect(ethiopianToGregorian({ year: 2018, month: 1, day: 1 })).toBe("2025-09-11");
    expect(gregorianToEthiopian("2025-09-11")).toEqual({ year: 2018, month: 1, day: 1 });

    // 2019 E.C. begins on 2026-09-11 (2018 E.C. Pagume has 5 days)
    expect(ethiopianToGregorian({ year: 2019, month: 1, day: 1 })).toBe("2026-09-11");
    expect(gregorianToEthiopian("2026-09-11")).toEqual({ year: 2019, month: 1, day: 1 });

    // After Ethiopian leap year 2019 E.C. (Pagume has 6 days), 2020 E.C. Meskerem 1 is 2027-09-12
    expect(ethiopianToGregorian({ year: 2020, month: 1, day: 1 })).toBe("2027-09-12");
    expect(gregorianToEthiopian("2027-09-12")).toEqual({ year: 2020, month: 1, day: 1 });
  });

  it("handles 5-day regular Pagume and 6-day leap Pagume", () => {
    const regularPagumeDays = getEthiopianMonthCells(2018, 13).filter(Boolean);
    expect(regularPagumeDays).toHaveLength(5);
    expect(regularPagumeDays[4]?.dateStr).toBe("2026-09-10");

    // 2019 % 4 === 3 => leap year in Ethiopian calendar -> Pagume has 6 days
    const leapPagumeDays = getEthiopianMonthCells(2019, 13).filter(Boolean);
    expect(leapPagumeDays).toHaveLength(6);
    expect(leapPagumeDays[5]?.dateStr).toBe("2027-09-11");
  });

  it("handles 30-day regular month ends accurately across the E.C. year", () => {
    const tikimtRange = getEthiopianMonthRange(2019, 2);
    expect(tikimtRange.startIso).toBe("2026-10-11");
    expect(tikimtRange.endIso).toBe("2026-11-09");
    expect(getEthiopianMonthCells(2019, 2).filter(Boolean)).toHaveLength(30);
  });

  it("resolves Ethiopian Fiscal Year (Hamle 1 to Sene 30) and fiscal quarter boundaries", () => {
    expect(getFiscalYear("2026-07-07")).toBe(2018); // Sene 30, 2018 E.C.
    expect(getFiscalYear("2026-07-08")).toBe(2019); // Hamle 1, 2018 E.C. -> EFY 2019

    const efy2019 = getFiscalYearInfo(2019);
    expect(efy2019.startIso).toBe("2026-07-08");
    expect(efy2019.endIso).toBe("2027-07-07");

    const quarters = getFiscalQuarters(2019);
    expect(quarters[0].quarter).toBe(1);
    expect(quarters[0].startIso).toBe("2026-07-08");
    expect(quarters[0].endIso).toBe("2026-10-10"); // Meskerem 30, 2019 E.C.

    expect(getFiscalQuarter("2026-10-10").quarter).toBe(1);
    expect(getFiscalQuarter("2026-10-11").quarter).toBe(2); // Tikimt 1, 2019 E.C.
  });

  it("formats 2026-11-27 as Hidar 18, 2019 E.C. and binds EFY 2019 to 2026-07-08 through 2027-07-07", () => {
    expect(gregorianToEthiopian("2026-11-27")).toEqual({ year: 2019, month: 3, day: 18 });
    expect(formatEthiopianDate("2026-11-27", "long")).toBe("Hidar 18, 2019 E.C.");
    const efy2019 = getFiscalYearInfo(2019);
    expect(efy2019.startIso).toBe("2026-07-08");
    expect(efy2019.endIso).toBe("2027-07-07");
  });

  it("rolls over day boundaries according to Africa/Addis_Ababa (UTC+3)", () => {
    // 20:59 UTC is 23:59 EAT on the same date
    expect(getTodayAddisIso(new Date("2026-11-26T20:59:59Z"))).toBe("2026-11-26");
    // 21:00 UTC is 00:00 EAT on the next calendar date
    expect(getTodayAddisIso(new Date("2026-11-26T21:00:00Z"))).toBe("2026-11-27");
  });
});
