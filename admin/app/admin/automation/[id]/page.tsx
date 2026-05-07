import { notFound } from 'next/navigation';
import PresetForm from '../preset-form';
import {
  getAutomationPreset,
  EVENT_OPTIONS,
  WEEKDAYS,
  CONDITION_OPTIONS,
  AUDIENCE_LABELS,
} from '@/lib/automation';
import { logAudit } from '@/lib/audit';

export default async function EditAutomationPresetPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const preset = await getAutomationPreset(id);
  if (!preset) notFound();

  await logAudit('USER_VIEWED', {
    targetType: 'automation_preset',
    targetId: preset.id,
  });

  return (
    <PresetForm
      preset={preset}
      eventOptions={EVENT_OPTIONS}
      weekdays={WEEKDAYS}
      conditionOptions={CONDITION_OPTIONS}
      audienceLabels={AUDIENCE_LABELS}
    />
  );
}
