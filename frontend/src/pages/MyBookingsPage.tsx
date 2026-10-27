import React, { useState, useEffect } from 'react';
import { Booking } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatBookingRange, isBookingPast } from '../utils/dateUtils';
import { Calendar, Clock, MapPin, XCircle, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

interface MyBookingsPageProps {
  onNotify: (msg: string, type: 'success' | 'error') => void;
}

export const MyBookingsPage: React.FC<MyBookingsPageProps> = ({ onNotify }) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchMyBookings = async () => {
    setLoading(true);
    try {
      const data = await api.getMyBookings();
      setBookings(data);
    } catch (err: any) {
      onNotify('Failed to retrieve your reservations', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyBookings();
  }, [user?.id]);

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this reservation? The slot will immediately become available for other employees.')) {
      return;
    }

    setCancellingId(bookingId);
    try {
      await api.cancelBooking(bookingId);
      onNotify('Reservation successfully cancelled', 'success');
      fetchMyBookings();
    } catch (err: any) {
      onNotify(err.response?.data?.message || 'Failed to cancel reservation', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Workspace Reservations</h1>
          <p className="text-xs text-slate-500 mt-1">
            Logged in as <strong className="text-slate-800">{user?.name}</strong> ({user?.email}). Times shown in your local timezone.
          </p>
        </div>

        <button
          onClick={fetchMyBookings}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : 'text-slate-500'}`} />
          Refresh
        </button>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-teal-600 mb-2" />
          <p className="text-sm font-medium">Loading your bookings...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">You have no active reservations</h3>
          <p className="text-xs text-slate-500 mt-1">Head over to the Resource Catalog to book a meeting room, desk, or equipment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bookings.map((b) => {
            const isConfirmed = b.status === 'CONFIRMED';
            const isPast = isBookingPast(b.end_time);
            const range = formatBookingRange(b.start_time, b.end_time);

            return (
              <div
                key={b.id}
                className={`bg-white rounded-2xl border p-5 transition-all shadow-sm flex flex-col justify-between ${
                  !isConfirmed
                    ? 'border-slate-200 bg-slate-50/50 opacity-70'
                    : 'border-slate-200/90 hover:border-teal-300'
                }`}
              >
                <div>
                  {/* Status & Type Bar */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {b.resource_type || 'RESOURCE'}
                    </span>

                    {isConfirmed ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {isPast ? 'Completed' : 'Confirmed'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                        <XCircle className="w-3.5 h-3.5" />
                        Cancelled
                      </span>
                    )}
                  </div>

                  {/* Resource Name */}
                  <h3 className="text-base font-bold text-slate-900 mt-1">{b.resource_name || 'Reserved Resource'}</h3>

                  {/* Location */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{b.resource_location || 'Office Headquarters'}</span>
                  </div>

                  {/* Schedule Block */}
                  <div className="mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      <span>{range.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{range.time} (Local)</span>
                    </div>
                  </div>

                  {/* Purpose */}
                  {b.purpose && (
                    <p className="text-xs text-slate-500 mt-2.5 italic">
                      "{b.purpose}"
                    </p>
                  )}
                </div>

                {/* Cancel Action */}
                {isConfirmed && !isPast && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-mono">ID: {b.id}</span>
                    <button
                      onClick={() => handleCancelBooking(b.id)}
                      disabled={cancellingId === b.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                    >
                      {cancellingId === b.id ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      Cancel Reservation
                    </button>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
