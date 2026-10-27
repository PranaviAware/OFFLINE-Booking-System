import React, { useState, useEffect } from 'react';
import { Resource } from '../types';
import { api } from '../api/client';
import { toUTCISO } from '../utils/dateUtils';
import { ConflictBadge } from './ConflictBadge';
import { X, Clock, Calendar as CalendarIcon, Tag, Globe2, ShieldAlert } from 'lucide-react';

interface BookingModalProps {
  resource: Resource | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({ resource, onClose, onSuccess }) => {
  // Tomorrow's date by default
  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const [dateStr, setDateStr] = useState<string>(getTomorrowStr());
  const [startTime, setStartTime] = useState<string>('10:00');
  const [endTime, setEndTime] = useState<string>('11:30');
  const [purpose, setPurpose] = useState<string>('');

  // Conflict Checking State
  const [checking, setChecking] = useState<boolean>(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [conflictReason, setConflictReason] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Derived UTC Timestamps
  const startUTC = toUTCISO(dateStr, startTime);
  const endUTC = toUTCISO(dateStr, endTime);

  // Time options (08:00 to 20:00 in 30 min intervals)
  const timeOptions = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'
  ];

  // Perform real-time pre-flight conflict check whenever date/time changes
  useEffect(() => {
    if (!resource || !startUTC || !endUTC) return;

    if (startTime >= endTime) {
      setIsAvailable(false);
      setConflictReason('End time must be after start time');
      return;
    }

    let isMounted = true;
    setChecking(true);
    setServerError(null);

    const timer = setTimeout(async () => {
      try {
        const res = await api.checkAvailability(resource.id, startUTC, endUTC);
        if (isMounted) {
          setIsAvailable(res.available);
          setConflictReason(res.conflictReason);
        }
      } catch (err: any) {
        if (isMounted) {
          setIsAvailable(null);
          setConflictReason(err.response?.data?.message || 'Availability check failed');
        }
      } finally {
        if (isMounted) {
          setChecking(false);
        }
      }
    }, 250); // 250ms debounce

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [resource?.id, startUTC, endUTC, startTime, endTime]);

  if (!resource) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAvailable || checking) return;

    setSubmitting(true);
    setServerError(null);

    try {
      await api.createBooking({
        resourceId: resource.id,
        startTime: startUTC,
        endTime: endUTC,
        purpose: purpose.trim() || undefined
      });
      onSuccess(`Successfully reserved ${resource.name}!`);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to complete booking';
      setServerError(msg);
      // Re-trigger conflict check if error is 409
      if (err.response?.status === 409) {
        setIsAvailable(false);
        setConflictReason(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600">Reserve Workspace</span>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5">{resource.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{resource.location}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Server Error Warning */}
          {serverError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Transaction Blocked:</span>
                <p className="mt-0.5">{serverError}</p>
              </div>
            </div>
          )}

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-teal-600" />
              Reservation Date
            </label>
            <input
              type="date"
              value={dateStr}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
              required
            />
          </div>

          {/* Time Block Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                Start Time
              </label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white transition-all font-mono"
              >
                {timeOptions.map((t) => (
                  <option key={`start-${t}`} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                End Time
              </label>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white transition-all font-mono"
              >
                {timeOptions.map((t) => (
                  <option key={`end-${t}`} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Real-time Conflict Pre-check Feedback */}
          <ConflictBadge
            loading={checking}
            available={isAvailable}
            conflictReason={conflictReason}
          />

          {/* Purpose / Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-teal-600" />
              Purpose (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., Sprint Planning, Client Demo, Focused Deep Work"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
            />
          </div>

          {/* UTC & Data Integrity Info Box */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 flex items-start gap-2">
            <Globe2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-700">Data Integrity Notice (UTC Normalization):</span>
              <p className="mt-0.5">
                Local time will be committed as: <br />
                <code className="text-slate-800 bg-slate-200/70 px-1 py-0.5 rounded font-mono">{startUTC.slice(0, 19)}Z</code> to{' '}
                <code className="text-slate-800 bg-slate-200/70 px-1 py-0.5 rounded font-mono">{endUTC.slice(0, 19)}Z</code>
              </p>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!isAvailable || checking || submitting}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all flex items-center gap-2 ${
                !isAvailable || checking || submitting
                  ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                  : 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/20 hover:shadow-md'
              }`}
            >
              {submitting ? 'Committing Atomic Lock...' : 'Confirm Reservation'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
