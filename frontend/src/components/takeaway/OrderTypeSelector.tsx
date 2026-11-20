import React from 'react';
import { CreditCard, Banknote, CalendarClock } from 'lucide-react';

interface OrderTypeSelectorProps {
  selectedMode: string;
  onModeChange: (mode: string) => void;
}

export default function OrderTypeSelector({ selectedMode, onModeChange }: OrderTypeSelectorProps) {
  const modes = [
    { id: 'pay_now', label: 'Pay Now', icon: <CreditCard size={16} />, color: 'emerald' },
    { id: 'pay_at_counter', label: 'Pay at Counter', icon: <Banknote size={16} />, color: 'blue' },
    { id: 'schedule', label: 'Schedule', icon: <CalendarClock size={16} />, color: 'amber' },
  ];

  return (
    <div className="space-y-3 mb-6">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Choose Order Mode</p>
      <div className="grid grid-cols-3 gap-2">
        {modes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => onModeChange(mode.id)}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-2
              ${selectedMode === mode.id 
                ? 'border-slate-900 dark:border-slate-100 bg-slate-900 dark:bg-slate-800 text-white shadow-md scale-[1.02]' 
                : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700'}`}
          >
            {mode.icon}
            <span className="text-[10px] font-black uppercase text-center leading-tight">
              {mode.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}