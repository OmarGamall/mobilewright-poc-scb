import type { Screen } from '@mobilewright/core';

type Locator = ReturnType<Screen['getByRole']>;

/** Extended locator interface to correctly type the text extraction method */
interface ExtendedLocator extends Locator {
  getText: () => Promise<string>;
}

/** Labels are matched in English; change this list if the app runs in another locale. */
const MONTHS: readonly string[] = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MAX_YEAR_SCROLLS = 10;
const SCROLL_SETTLE_MS = 300;

export interface PickerDate {
  year: number;
  month: number; // 1-12
  day: number;
}

interface MonthView {
  year: number;
  month: number; // 1-12
}

// ============================================================================
// Helpers
// ============================================================================

/** Absolute month number, so the difference of two views is the number of taps needed. */
const toMonthIndex = ({ year, month }: MonthView): number => year * 12 + month;

function assertValidDate({ year, month, day }: PickerDate): void {
  const d = new Date(Date.UTC(year, month - 1, day));
  const isReal =
    d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
  if (!isReal) throw new Error(`Invalid date ${year}-${month}-${day}`);
}

/** Parses a header label such as "Select year\nSeptember 2026". */
function parseHeaderLabel(label: string): MonthView {
  const match = label.match(/([A-Za-z]+)\s+(\d{4})/);
  const month = match ? MONTHS.indexOf(match[1]) + 1 : 0;
  if (!match || month === 0) {
    throw new Error(`Unrecognized calendar header: ${JSON.stringify(label)}`);
  }
  return { month, year: Number(match[2]) };
}

/**
 * @fileoverview DatePicker Component Object.
 * Reusable wrapper for the Flutter Material date picker (bottom sheet).
 */
export class DatePicker {
  constructor(private readonly screen: Screen) {}

  // ============================================================================
  // LOCATORS (private factory methods)
  // ============================================================================

  private title() {
    return this.screen.getByLabel('Select Date');
  }
  
  /** Button showing the visible month; tapping it toggles the year list. */
  private header() {
    return this.screen.getByRole('button', { name: /^Select year\s/ });
  }
  
  private headerFor({ year, month }: MonthView) {
    return this.screen.getByRole('button', {
      name: new RegExp(`^Select year\\s${MONTHS[month - 1]} ${year}$`),
    });
  }
  
  private yearButton(year: number) {
    return this.screen.getByRole('button', { name: new RegExp(`^${year}$`) });
  }
  
  /** Matches "28, Monday, September 28, 2026" and variants with a suffix such as ", Today". */
  private dayButton({ year, month, day }: PickerDate) {
    return this.screen.getByRole('button', {
      name: new RegExp(`^${day}, [A-Za-z]+, ${MONTHS[month - 1]} ${day}, ${year}(,|$)`),
    });
  }
  
  private prevMonthButton() {
    return this.screen.getByRole('button', { name: 'Previous month' });
  }
  
  private nextMonthButton() {
    return this.screen.getByRole('button', { name: 'Next month' });
  }
  
  private applyButton() {
    return this.screen.getByRole('button', { name: /^Apply$/ });
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Main workflow to pick a specific date from the calendar.
   * Handles opening the year selector, scrolling, month navigation, and day selection.
   * 
   * @param date - The target date to be picked (year, month 1-12, day).
   * @throws {Error} If the provided date is invalid or UI elements are not found.
   */
  async pick(date: PickerDate): Promise<void> {
    assertValidDate(date);
    await this.waitUntilOpen();

    const initial = await this.readVisibleMonth();
    await this.selectYear(date.year, initial.year);
    await this.goToMonth(date);
    await this.selectDay(date);
    await this.applyButton().tap();
  }

  // ============================================================================
  // VERIFY METHODS
  // ============================================================================

  /**
   * Waits for the date picker bottom sheet to open and become visible.
   * Throws an error if the date picker title is not found.
   */
  async waitUntilOpen(): Promise<void> {
    await this.waitOrThrow(this.title(), 'Date picker did not open');
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /** Opens the year list, scrolls until the year is visible, then taps it. */
  private async selectYear(targetYear: number, shownYear: number): Promise<void> {
    await this.header().tap();

    const yearButton = this.yearButton(targetYear);
    const direction = targetYear < shownYear ? 'older' : 'newer';

    for (let scrolls = 0; scrolls <= MAX_YEAR_SCROLLS; scrolls++) {
      if (await yearButton.isVisible()) {
        await yearButton.tap();
        return;
      }
      if (scrolls < MAX_YEAR_SCROLLS) await this.scrollYears(direction);
    }
    throw new Error(
      `Year ${targetYear} not reachable after ${MAX_YEAR_SCROLLS} scrolls (outside firstDate/lastDate?)`,
    );
  }

  /** Picking a year keeps the displayed month, so navigate whichever way is needed. */
  private async goToMonth(target: MonthView): Promise<void> {
    await this.waitOrThrow(this.prevMonthButton(), 'Calendar did not return after year selection');

    const current = await this.readVisibleMonth();
    const steps = toMonthIndex(target) - toMonthIndex(current);
    const arrow = steps > 0 ? this.nextMonthButton() : this.prevMonthButton();

    for (let i = 0; i < Math.abs(steps); i++) {
      await arrow.tap();
    }
    await this.waitOrThrow(
      this.headerFor(target),
      `Calendar did not reach ${MONTHS[target.month - 1]} ${target.year}`,
    );
  }

  private async selectDay(date: PickerDate): Promise<void> {
    const dayButton = this.dayButton(date);
    await this.waitOrThrow(
      dayButton,
      `Day ${date.year}-${date.month}-${date.day} not found: label mismatch, or date is disabled.`,
    );
    await dayButton.tap();
  }

  /**
   * 'older' reveals earlier years (finger moves down), 'newer' the opposite.
   * UNPROVEN: the swipe is screen-wide. Replace with a scoped scroll/drag when supported.
   * Requires a short setTimeout to allow the swipe animation to settle because
   * there is no observable UI ready-signal for scroll completion.
   */
  private async scrollYears(direction: 'older' | 'newer'): Promise<void> {
    await this.screen.swipe(direction === 'older' ? 'down' : 'up');
    
    // Acceptable setTimeout per AGENTS.md rule: Wait for scroll animation to physically stop 
    // because Flutter provides no layout-stable event hook here.
    await new Promise((resolve) => setTimeout(resolve, SCROLL_SETTLE_MS));
  }

  private async readVisibleMonth(): Promise<MonthView> {
    const extendedHeader = this.header() as unknown as ExtendedLocator;
    const label: string = await extendedHeader.getText();
    return parseHeaderLabel(label);
  }

  /** Waits for visibility; on timeout, throws a message that says what was expected. */
  private async waitOrThrow(locator: Locator, failureMessage: string): Promise<void> {
    try {
      await locator.waitFor({ state: 'visible' });
    } catch (error) {
      throw new Error(`${failureMessage}\nCaused by: ${(error as Error).message}`);
    }
  }
}