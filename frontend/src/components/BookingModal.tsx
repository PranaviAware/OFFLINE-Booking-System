import React, { useState, useEffect } from 'react';
import { Resource } from '../types';
import { api } from '../api/client';
import { toUTCISO } from '../utils/dateUtils';

interface BookingModalProps {
  resource: Resource | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({ resource, onClose, onSuccess }) => {
  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const [dateStr, setDateStr] = useState<string>(getTomorrowStr());
  const [startTime, setStartTime] = useState<string>('10:00');
  const [endTime, setEndTime] = useState<string>('11:30');
  const [purpose, setPurpose] = useState<string>('');

  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [conflictReason, setConflictReason] = useState<string | null>(null);
  const [checking, setChecking] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const startUTC = toUTCISO(dateStr, startTime);
  const endUTC = toUTCISO(dateStr, endTime);

  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00'
  ];

  // Real-time conflict check
  useEffect(() => {
    if (!resource || !startUTC || !endUTC) return;

    if (startTime >= endTime) {
      setIsAvailable(false);
      setConflictReason('End time must be after start time');
      return;
    }

    setChecking(true);
    setErrorMessage(null);

    const timer = setTimeout(async () => {
      try {
        const res = await api.checkAvailability(resource.id, startUTC, endUTC);
        setIsAvailable(res.available);
        setConflictReason(res.available ? null : (res.conflictReason || 'Slot already booked'));
      } catch (err: any) {
        setIsAvailable(false);
        setConflictReason(err.response?.data?.message || 'Check failed');
      } finally {
        setChecking(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [resource?.id, startUTC, endUTC, startTime, endTime]);

  if (!resource) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAvailable || checking) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await api.createBooking({
        resourceId: resource.id,
        startTime: startUTC,
        endTime: endUTC,
        purpose: purpose.trim() || undefined
      });
      onSuccess(`Booking confirmed for ${resource.name}!`);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Booking conflict: could not complete reservation');
      setIsAvailable(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-md w-full p-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Book {resource.name}</h3>
            <p className="text-xs text-slate-500">{resource.location}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
            ✕
          </button>
        </div>

        {errorMessage && (
          <div className="mt-3 p-2.5 rounded bg-red-50 border border-red-200 text-red-700 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Booking Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Date</label>
            <input
              type="date"
              required
              min={new Date().toISOString().split('T')[0]}
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-kpit-green"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Start Time</label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-kpit-green font-mono"
              >
                {timeSlots.map((t) => (
                  <option key={`start-${t}`} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">End Time</label>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-kpit-green font-mono"
              >
                {timeSlots.map((t) => (
                  <option key={`end-${t}`} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Real-time conflict feedback */}
          <div className="py-1">
            {checking ? (
              <span className="text-slate-500 text-xs">Checking availability...</span>
            ) : isAvailable === true ? (
              <span className="text-emerald-600 text-xs font-semibold">✓ Slot is available</span>
            ) : isAvailable === false ? (
              <span className="text-red-600 text-xs font-semibold">✗ {conflictReason || 'Slot already booked'}</span>
            ) : null}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Purpose (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Project discussion, focused work"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-kpit-green"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-medium"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!isAvailable || checking || submitting}
              className={`px-4 py-1.5 rounded-md text-white font-semibold text-xs transition-colors shadow-sm ${
                !isAvailable || checking || submitting
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-kpit-green hover:bg-kpit-greenHover'
              }`}
            >
              {submitting ? 'Booking...' : 'Confirm Booking'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
