import { PRODUCT } from '../config/product';
import { en } from '../i18n/en';

const SEC_PER_MIN = 60;

/** Error code of `createManualSession` / `correctSession` as a sentence for the form. */
export function editErrorText(error: string): string {
  const errors = en.stats.form.errors;
  switch (error) {
    case 'invalid_time':
      return errors.invalid_time;
    case 'too_short':
      return errors.too_short(Math.ceil(PRODUCT.timer.minCountedSec / SEC_PER_MIN));
    case 'too_long':
      return errors.too_long(PRODUCT.stats.manualMaxMin);
    case 'in_future':
      return errors.in_future;
    case 'not_a_number':
      return errors.not_a_number;
    case 'not_found':
      return errors.not_found;
    case 'overlap':
      return errors.overlap;
    default:
      return errors.failed;
  }
}

/** Whole minutes typed by the user; null when it is not a plain positive integer. */
export function parseMinutes(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d{1,4}$/.test(trimmed)) return null;
  return Number(trimmed);
}
