import React, { useState, useEffect } from 'react';
import { Booking } from '../types';
import { api } from '../api/client';
import { formatBookingRange, isBookingPast } from '../utils/dateUtils';
import { RefreshCw, CalendarCheck, Clock, X, AlertTriangle } from 'lucide-react';

interface MyBookingsPageProps {
  onNotify: (msg: string, type: 'success' | 'error') => void;
}

type StatusFilter = 'ALL' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED';

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'UPCOMING', label: 'Upcoming' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

/** Inline confirmation modal replacing window.confirm */
const ConfirmModal: React.FC<{
  resourceName: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ resourceName, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
    <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Cancel Reservation?</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            This will cancel your booking for <strong>{resourceName}</strong>. This action cannot be undone.
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
        >
          Keep Booking
        </button>
        <button
          onClick={onConfirm}
          className="px-3.5 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Yes, Cancel It
        </button>
      </div>
    </div>
  </div>
);

export const MyBookingsPage: React.FC<MyBookingsPageProps> = ({ onNotify }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<boolean>(false);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await api.getMyBookings();
      setBookings(data);
    } catch {
      onNotify('Failed to fetch your bookings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancel = async () => {
    if (!confirmId) return;
    setCancelling(true);
    try {
      await api.cancelBooking(confirmId);
      onNotify('Booking cancelled successfully', 'success');
      setConfirmId(null);
      fetchBookings();
    } catch (err: any) {
      onNotify(err.response?.data?.message || 'Could not cancel booking', 'error');
    } finally {
      setCancelling(false);
    }
  };

  // Client-side filter by computed status
  const filteredBookings = bookings.filter((b) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'CANCELLED') return b.status === 'CANCELLED';
    if (statusFilter === 'COMPLETED') return b.status === 'CONFIRMED' && isBookingPast(b.end_time);
    if (statusFilter === 'UPCOMING') return b.status === 'CONFIRMED' && !isBookingPast(b.end_time);
    return true;
  });

  const getStatusBadge = (b: Booking) => {
    if (b.status === 'CANCELLED') return { label: 'Cancelled', cls: 'bg-slate-100 text-slate-500' };
    if (isBookingPast(b.end_time)) return { label: 'Completed', cls: 'bg-blue-100 text-blue-700' };
    return { label: 'Upcoming', cls: 'bg-emerald-100 text-emerald-700' };
  };

  const confirmingBooking = bookings.find(b => b.id === confirmId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Bookings</h1>
          <p className="text-xs text-slate-500">View and manage your workspace reservations.</p>
        </div>
        <button
          onClick={fetchBookings}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1.5 text-xs border-b border-slate-200 pb-2">
        {STATUS_TABS.map((tab) => {
          const count = bookings.filter((b) => {
            if (tab.id === 'ALL') return true;
            if (tab.id === 'CANCELLED') return b.status === 'CANCELLED';
            if (tab.id === 'COMPLETED') return b.status === 'CONFIRMED' && isBookingPast(b.end_time);
            if (tab.id === 'UPCOMING') return b.status === 'CONFIRMED' && !isBookingPast(b.end_time);
            return false;
          }).length;

          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                statusFilter === tab.id
                  ? 'bg-kpit-purple text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-[10px] font-bold px-1 py-0.5 rounded-full ${
                statusFilter === tab.id ? 'bg-white/20' : 'bg-slate-200'
              }`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Bookings Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-slate-200 p-4 space-y-2.5">
              <div className="flex justify-between">
                <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
              </div>
              <div className="h-5 w-3/4 bg-slate-200 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
              <div className="h-3 w-2/3 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white rounded-lg border border-dashed border-slate-300 p-10 text-center">
          <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">
            {statusFilter === 'ALL'
              ? "You don't have any reservations yet."
              : `No ${statusFilter.toLowerCase()} bookings.`}
          </p>
          {statusFilter === 'ALL' && (
            <p className="text-xs text-slate-400 mt-1">Go to the Catalog to book a desk or meeting room.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredBookings.map((b) => {
            const badge = getStatusBadge(b);
            const isUpcoming = b.status === 'CONFIRMED' && !isBookingPast(b.end_time);
            const range = formatBookingRange(b.start_time, b.end_time);

            return (
              <div
                key={b.id}
                className={`bg-white rounded-lg border p-4 shadow-sm flex flex-col justify-between transition-opacity ${
                  b.status === 'CANCELLED' ? 'opacity-60' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {b.resource_type?.replace('_', ' ') || 'RESOURCE'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base">{b.resource_name}</h3>
                  <p className="text-xs text-slate-500">{b.resource_location}</p>

                  <div className="mt-2.5 space-y-0.5 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <CalendarCheck className="w-3.5 h-3.5 text-slate-400" />
                      {range.date}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {range.time}
                    </div>
                  </div>

                  {b.purpose && (
                    <p className="text-xs text-slate-500 mt-2 italic">"{b.purpose}"</p>
                  )}
                </div>

                {isUpcoming && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={() => setConfirmId(b.id)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel Reservation
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Inline Confirm Modal */}
      {confirmId && confirmingBooking && (
        <ConfirmModal
          resourceName={confirmingBooking.resource_name || 'this resource'}
          onConfirm={handleCancel}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  );
};
