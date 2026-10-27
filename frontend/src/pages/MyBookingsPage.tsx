import React, { useState, useEffect } from 'react';
import { Booking } from '../types';
import { api } from '../api/client';
import { formatBookingRange, isBookingPast } from '../utils/dateUtils';

interface MyBookingsPageProps {
  onNotify: (msg: string, type: 'success' | 'error') => void;
}

export const MyBookingsPage: React.FC<MyBookingsPageProps> = ({ onNotify }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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

  const handleCancel = async (id: string) => {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      await api.cancelBooking(id);
      onNotify('Booking cancelled successfully', 'success');
      fetchBookings();
    } catch (err: any) {
      onNotify(err.response?.data?.message || 'Could not cancel booking', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Bookings</h1>
          <p className="text-xs text-slate-500">View and manage your workspace reservations.</p>
        </div>
        <button
          onClick={fetchBookings}
          className="px-3 py-1.5 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">Loading your bookings...</div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-lg border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
          You don't have any reservations yet. Go to the Catalog to book a desk or meeting room.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {bookings.map((b) => {
            const isConfirmed = b.status === 'CONFIRMED';
            const isPast = isBookingPast(b.end_time);
            const range = formatBookingRange(b.start_time, b.end_time);

            return (
              <div
                key={b.id}
                className={`bg-white rounded-lg border p-4 shadow-sm flex flex-col justify-between ${
                  !isConfirmed ? 'opacity-60 bg-slate-50' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {b.resource_type || 'RESOURCE'}
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isConfirmed
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isConfirmed ? (isPast ? 'COMPLETED' : 'CONFIRMED') : 'CANCELLED'}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base">{b.resource_name}</h3>
                  <p className="text-xs text-slate-500">{b.resource_location}</p>

                  <div className="mt-2 text-xs font-mono text-slate-700">
                    <div>📅 {range.date}</div>
                    <div>🕒 {range.time}</div>
                  </div>

                  {b.purpose && (
                    <p className="text-xs text-slate-500 mt-2 italic">"{b.purpose}"</p>
                  )}
                </div>

                {isConfirmed && !isPast && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={() => handleCancel(b.id)}
                      className="px-3 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50 text-xs font-semibold"
                    >
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
