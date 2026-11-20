import { ChevronRight } from "lucide-react";

export default function CheckoutAction({ total, onConfirm, disabled }: any) {
  return (
    <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 transition-colors">
      <div className="flex justify-between items-center mb-4">
        <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">To Pay at Counter</span>
        <span className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">₹{total}</span>
      </div>
      
      <button 
        type="button"
        onClick={onConfirm}
        disabled={disabled}
        className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-lg 
                   hover:bg-emerald-700 active:scale-[0.98] disabled:bg-slate-200 dark:disabled:bg-slate-800 dark:disabled:text-slate-600
                   transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-200 dark:shadow-none"
      >
        PICK AND PAY
        <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
          <ChevronRight size={16} />
        </div>
      </button>
      
      <p className="text-center text-[10px] text-slate-400 mt-3 font-bold uppercase tracking-tighter">
        Chef is notified instantly via Live Dashboard
      </p>
    </div>
  );
}