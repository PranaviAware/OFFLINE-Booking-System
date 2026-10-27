import React from 'react';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

interface ConflictBadgeProps {
  loading: boolean;
  available: boolean | null;
  conflictReason?: string;
}

export const ConflictBadge: React.FC<ConflictBadgeProps> = ({ loading, available, conflictReason }) => {
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
        <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
        <span>Verifying real-time slot availability...</span>
      </div>
    );
  }

  if (available === true) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Slot is free! Real-time pre-check passed.</span>
      </div>
    );
  }

  if (available === false) {
    return (
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-50 text-rose-800 text-xs font-medium border border-rose-200">
        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Reservation Conflict:</span>
          <p className="mt-0.5 text-rose-700">{conflictReason || 'This resource is already reserved for the chosen time.'}</p>
        </div>
      </div>
    );
  }

  return null;
};
