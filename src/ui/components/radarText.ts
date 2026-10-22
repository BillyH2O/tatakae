import type { RadarAxisResult } from '../../domain/radar';
import { en } from '../../i18n/en';

const form = en.home.form;

/** Displayed value: floored, "—" while there is not enough data (never a fake 0). */
export function radarValueText(axis: RadarAxisResult): string {
  return axis.value === null ? '—' : String(Math.min(100, Math.floor(axis.value)));
}

/** One line saying what the figure is based on, or what is missing. */
export function radarSampleText(axis: RadarAxisResult): string {
  const { detail } = axis;
  switch (detail.axis) {
    case 'strength':
      return axis.status === 'ok' ? form.strengthSample(detail.rated) : form.strengthMissing(detail.rated, detail.required);
    case 'endurance':
      if (axis.status !== 'ok') return form.enduranceMissing;
      return `${form.enduranceSample(detail.focusMin, detail.goalMin)}${axis.inProgress ? ` · ${form.inProgress}` : ''}`;
    case 'mental':
      return axis.status === 'ok' ? form.mentalSample(detail.completed, detail.completed + detail.stopped) : form.mentalMissing;
    case 'consistency':
      return axis.status === 'ok' ? form.consistencySample(detail.achieved, detail.planned) : form.consistencyMissing;
  }
}

/** Neutral summary of the early stops ("2 early stops: Interrupted ×1, Tired ×1"); empty when none. */
export function radarStopsText(axis: RadarAxisResult): string | null {
  if (axis.detail.axis !== 'mental' || axis.detail.stopped === 0) return null;
  const reasons = Object.entries(axis.detail.stopReasons)
    .map(([reason, count]) => `${en.focus.running.reasons[reason as keyof typeof en.focus.running.reasons]} ×${count}`)
    .join(', ');
  return form.mentalStops(axis.detail.stopped, reasons);
}

export function radarAxisA11y(axis: RadarAxisResult): string {
  const name = form.axes[axis.axis];
  const base = axis.value === null ? form.noValueA11y(name) : form.valueA11y(name, Math.min(100, Math.floor(axis.value)));
  return `${base}. ${radarSampleText(axis)}`;
}
