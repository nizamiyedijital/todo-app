import PresetForm from '../preset-form';
import {
  EVENT_OPTIONS,
  WEEKDAYS,
  CONDITION_OPTIONS,
  AUDIENCE_LABELS,
} from '@/lib/automation';

export default function NewAutomationPresetPage() {
  return (
    <PresetForm
      eventOptions={EVENT_OPTIONS}
      weekdays={WEEKDAYS}
      conditionOptions={CONDITION_OPTIONS}
      audienceLabels={AUDIENCE_LABELS}
    />
  );
}
