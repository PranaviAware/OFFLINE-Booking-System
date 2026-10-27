import React, { useState, useEffect } from 'react';
import { Booking, Resource, ResourceType } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatBookingRange } from '../utils/dateUtils';

interface AdminDashboardPageProps {
  onNotify: (msg: string, type: 'success' | 'error') => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onNotify }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'bookings' | 'resources'>('bookings');
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Add Resource state
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<ResourceType>('MEETING_ROOM');
  const [capacity, setCapacity] = useState(4);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  const loadData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const bData = await api.getAllBookingsAdmin();
      setAllBookings(bData);
      const rData = await api.getResources({ all: true });
      setResources(rData);
    } catch {
      onNotify('Failed to load admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAdmin]);

  const handleAdminCancel = async (id: string) => {
    if (!window.confirm('Admin Override: Cancel this booking?')) return;
    try {
      await api.cancelBooking(id);
      onNotify('Booking cancelled by Admin', 'success');
      loadData();
    } catch (err: any) {
      onNotify(err.response?.data?.message || 'Cancel failed', 'error');
    }
  };

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createResource({
        name,
        type,
        capacity: Number(capacity),
        location,
        description: description || undefined
      });
      onNotify(`Added resource: ${name}`, 'success');
      setShowAddForm(false);
      setName('');
      setLocation('');
      setDescription('');
      loadData();
    } catch (err: any) {
      onNotify(err.response?.data?.message || 'Failed to add resource', 'error');
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-8 text-center max-w-lg mx-auto">
        <h2 className="text-base font-bold text-red-600 mb-1">Access Restricted</h2>
        <p className="text-xs text-slate-600">
          You are currently signed in as <strong>{user?.name}</strong> (Role: {user?.role}). Only administrators can view this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      
      {/* Title & Tabs */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-kpit-purple">Admin Management Console</h1>
          <p className="text-xs text-slate-500">Manage all employee reservations and workspace resources.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
              activeTab === 'bookings'
                ? 'bg-kpit-purple text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Bookings ({allBookings.length})
          </button>

          <button
            onClick={() => setActiveTab('resources')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
              activeTab === 'resources'
                ? 'bg-kpit-purple text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Manage Resources ({resources.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Bookings */}
      {activeTab === 'bookings' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Resource</th>
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Purpose</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allBookings.map((b) => {
                  const range = formatBookingRange(b.start_time, b.end_time);
                  const isConfirmed = b.status === 'CONFIRMED';

                  return (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{b.resource_name}</td>
                      <td className="py-2.5 px-3 text-slate-700">{b.user_name || b.user_id}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{range.date} ({range.time})</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isConfirmed ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">{b.purpose || '—'}</td>
                      <td className="py-2.5 px-3 text-right">
                        {isConfirmed && (
                          <button
                            onClick={() => handleAdminCancel(b.id)}
                            className="px-2 py-1 text-[11px] font-semibold border border-red-300 text-red-600 hover:bg-red-50 rounded"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Manage Resources */}
      {activeTab === 'resources' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 bg-kpit-green hover:bg-kpit-greenHover text-white text-xs font-semibold rounded-md shadow-sm"
            >
              {showAddForm ? 'Close Form' : '+ Add New Resource'}
            </button>
          </div>

          {showAddForm && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
              <h3 className="font-bold text-slate-900 text-sm mb-3">New Resource</h3>
              <form onSubmit={handleCreateResource} className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Focus Room C"
                    className="w-full px-2.5 py-1.5 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as ResourceType)}
                    className="w-full px-2.5 py-1.5 border rounded-md bg-white"
                  >
                    <option value="MEETING_ROOM">Meeting Room</option>
                    <option value="DESK">Desk</option>
                    <option value="EQUIPMENT">Equipment</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Capacity</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Location</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Floor 2, East"
                    className="w-full px-2.5 py-1.5 border rounded-md"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold mb-1">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Dual monitors, whiteboard"
                    className="w-full px-2.5 py-1.5 border rounded-md"
                  />
                </div>

                <div className="col-span-2 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1 border rounded-md text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1 bg-kpit-green text-white font-semibold rounded-md"
                  >
                    Save Resource
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {resources.map((r) => (
              <div key={r.id} className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-900">{r.name}</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                    {r.type}
                  </span>
                </div>
                <p className="text-slate-500">{r.location} (Capacity: {r.capacity})</p>
                {r.description && <p className="text-slate-600 mt-1 line-clamp-1">{r.description}</p>}
              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  );
};
