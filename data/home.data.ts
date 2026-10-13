import type { PickerDate } from '../components/DatePicker';

/** Values typed into the Phase 3 form on the Home screen. */
export interface Phase3FormData {
  username: string;
  country: string;
  date: PickerDate;
}

/** A valid Phase 3 form entry. */
export const PHASE3_FORM: Phase3FormData = {
  username: 'omar_phase3',
  country: 'Egypt',
  date: { year: 2026, month: 9, day: 15 },
};
