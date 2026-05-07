'use client';

import { useState, useTransition } from 'react';
import { togglePreset } from './actions';

export function ToggleEnabledButton({
  id,
  enabled,
}: {
  id: string;
  enabled: boolean;
}) {
  const [isOn, setIsOn] = useState(enabled);
  const [isPending, startTransition] = useTransition();

  const onToggle = () => {
    const next = !isOn;
    setIsOn(next); // optimistic
    startTransition(async () => {
      const r = await togglePreset(id, next);
      if (!r.ok) setIsOn(!next); // rollback
    });
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      onClick={onToggle}
      disabled={isPending}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#12A3E3] focus:ring-offset-2 ${
        isOn ? 'bg-[#12A3E3]' : 'bg-slate-300 dark:bg-slate-700'
      } ${isPending ? 'opacity-60' : ''}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
          isOn ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
