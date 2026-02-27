/**
 * Natural Language Date Parser (v1.3)
 * Parses phrases like "tomorrow", "next Friday", "in 3 days" into ISO dates
 */

export function parseNaturalDate(input: string, baseDate: Date = new Date()): string | null {
  const normalized = input.toLowerCase().trim();
  
  // Handle relative dates
  if (normalized === "today") {
    return formatDate(baseDate);
  }
  
  if (normalized === "tomorrow") {
    const tomorrow = new Date(baseDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDate(tomorrow);
  }
  
  if (normalized === "next week") {
    const nextWeek = new Date(baseDate);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return formatDate(nextWeek);
  }
  
  if (normalized === "in 2 weeks" || normalized === "in two weeks") {
    const twoWeeks = new Date(baseDate);
    twoWeeks.setDate(twoWeeks.getDate() + 14);
    return formatDate(twoWeeks);
  }
  
  // Handle "in X days/weeks/months"
  const inDaysMatch = normalized.match(/in (\d+|one|two|three|four|five|six|seven) days?/);
  if (inDaysMatch) {
    const numDays = parseNumber(inDaysMatch[1]);
    const futureDate = new Date(baseDate);
    futureDate.setDate(futureDate.getDate() + numDays);
    return formatDate(futureDate);
  }
  
  const inWeeksMatch = normalized.match(/in (\d+|one|two|three|four|five|six|seven) weeks?/);
  if (inWeeksMatch) {
    const numWeeks = parseNumber(inWeeksMatch[1]);
    const futureDate = new Date(baseDate);
    futureDate.setDate(futureDate.getDate() + (numWeeks * 7));
    return formatDate(futureDate);
  }
  
  // Handle "next [day of week]"
  const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const nextDayMatch = normalized.match(/next (\w+)/);
  if (nextDayMatch) {
    const targetDay = nextDayMatch[1].toLowerCase();
    const targetIndex = daysOfWeek.indexOf(targetDay);
    if (targetIndex !== -1) {
      const today = baseDate.getDay();
      let daysUntil = targetIndex - today;
      if (daysUntil <= 0) {
        daysUntil += 7;
      }
      const nextDayDate = new Date(baseDate);
      nextDayDate.setDate(nextDayDate.getDate() + daysUntil);
      return formatDate(nextDayDate);
    }
  }
  
  // Handle "this [day of week]"
  const thisDayMatch = normalized.match(/this (\w+)/);
  if (thisDayMatch) {
    const targetDay = thisDayMatch[1].toLowerCase();
    const targetIndex = daysOfWeek.indexOf(targetDay);
    if (targetIndex !== -1) {
      const today = baseDate.getDay();
      let daysUntil = targetIndex - today;
      if (daysUntil < 0) {
        daysUntil += 7;
      }
      const thisDayDate = new Date(baseDate);
      thisDayDate.setDate(thisDayDate.getDate() + daysUntil);
      return formatDate(thisDayDate);
    }
  }
  
  // Handle "at [time]" format - return with time
  const timeMatch = normalized.match(/at (\d{1,2}):?(\d{2})?\s*(am|pm)?/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const period = timeMatch[3];
    
    let adjustedHours = hours;
    if (period === "pm" && hours !== 12) {
      adjustedHours = hours + 12;
    } else if (period === "am" && hours === 12) {
      adjustedHours = 0;
    }
    
    const dateWithTime = new Date(baseDate);
    dateWithTime.setHours(adjustedHours, minutes, 0, 0);
    return formatDateTime(dateWithTime);
  }
  
  return null;
}

function parseNumber(word: string): number {
  const wordToNum: Record<string, number> = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10
  };
  
  if (word in wordToNum) {
    return wordToNum[word];
  }
  
  return parseInt(word, 10);
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTime(date: Date): string {
  return date.toISOString();
}

export function expandNaturalDates(content: string): { content: string; hasDates: boolean } {
  // Find patterns like "tomorrow", "next Friday", "in 3 days" and convert to ISO dates
  const datePatterns = [
    { pattern: /\btoday\b/gi, fn: () => formatDate(new Date()) },
    { pattern: /\btomorrow\b/gi, fn: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return formatDate(d);
    }},
    { pattern: /\bnext week\b/gi, fn: () => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      return formatDate(d);
    }},
    { pattern: /\bin (\d+|one|two|three|four|five|six|seven) days?\b/gi, fn: (match: string, num: string) => {
      const d = new Date();
      d.setDate(d.getDate() + parseNumber(num));
      return formatDate(d);
    }},
    { pattern: /\bnext (sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi, fn: (match: string, day: string) => {
      const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const targetIndex = daysOfWeek.indexOf(day.toLowerCase());
      const today = new Date().getDay();
      let daysUntil = targetIndex - today;
      if (daysUntil <= 0) daysUntil += 7;
      const d = new Date();
      d.setDate(d.getDate() + daysUntil);
      return formatDate(d);
    }},
  ];
  
  let hasDates = false;
  let result = content;
  
  for (const { pattern, fn } of datePatterns) {
    if (pattern.test(result)) {
      hasDates = true;
      result = result.replace(pattern, fn as any);
    }
  }
  
  return { content: result, hasDates };
}
