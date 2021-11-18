import { formatTimeAgo } from "./util";
import dayjs from "dayjs";

const testDate = dayjs("2020-01-01");

beforeAll(() => {
  jest.useFakeTimers().setSystemTime(testDate.toDate());
});

afterAll(() => {
  jest.useRealTimers();
});

describe("formatTimeAgo", () => {
  test("years", () => {
    expect(formatTimeAgo(testDate.subtract(1, "year").toDate())).toEqual(
      "1 year ago"
    );
    expect(formatTimeAgo(testDate.subtract(2, "year").toDate())).toEqual(
      "2 years ago"
    );
  });
  test("months", () => {
    expect(formatTimeAgo(testDate.subtract(1, "month").toDate())).toEqual(
      "1 month ago"
    );
    expect(formatTimeAgo(testDate.subtract(2, "month").toDate())).toEqual(
      "2 months ago"
    );
  });
  test("weeks", () => {
    expect(formatTimeAgo(testDate.subtract(1, "week").toDate())).toEqual(
      "1 week ago"
    );
    expect(formatTimeAgo(testDate.subtract(2, "week").toDate())).toEqual(
      "2 weeks ago"
    );
  });
  test("days", () => {
    expect(formatTimeAgo(testDate.subtract(1, "day").toDate())).toEqual(
      "1 day ago"
    );
    expect(formatTimeAgo(testDate.subtract(2, "day").toDate())).toEqual(
      "2 days ago"
    );
  });
  test("hours", () => {
    expect(formatTimeAgo(testDate.subtract(1, "hour").toDate())).toEqual(
      "1 hour ago"
    );
    expect(formatTimeAgo(testDate.subtract(2, "hour").toDate())).toEqual(
      "2 hours ago"
    );
  });
  test("minutes", () => {
    expect(formatTimeAgo(testDate.subtract(1, "minute").toDate())).toEqual(
      "1 minute ago"
    );
    expect(formatTimeAgo(testDate.subtract(2, "minute").toDate())).toEqual(
      "2 minutes ago"
    );
  });
  test("seconds", () => {
    expect(formatTimeAgo(testDate.subtract(1, "second").toDate())).toEqual(
      "1 second ago"
    );
    expect(formatTimeAgo(testDate.subtract(2, "second").toDate())).toEqual(
      "2 seconds ago"
    );
  });
});
