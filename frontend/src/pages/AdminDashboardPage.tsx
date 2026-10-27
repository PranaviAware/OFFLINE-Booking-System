import React, { useState, useEffect } from 'react';
import { Booking, Resource, ResourceType } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatBookingRange } from '../utils/dateUtils';
import { ShieldAlert, ShieldCheck, Plus, XCircle, RefreshCw, Calendar, CheckCircle2, User, Layers } from 'lucide-react';

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
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // New Resource Form Modal / Inline
  const [showAddResource, setShowAddResource] = useState<boolean>(false);
  const [newResName, setNewResName] = useState<string>('');
  const [newResType, setNewResType] = useState<ResourceType>('MEETING_ROOM');
  const [newResCapacity, setNewResCapacity] = useState<number>(4);
  const [newResLocation, setNewResLocation] = useState<string>('');
  const [newResDesc, setNewResDesc] = useState<string>('');
  const [submittingRes, setSubmittingRes] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const bookingsData = await api.getAllBookingsAdmin({
          status: statusFilter === 'ALL' ? undefined : statusFilter
        });
        setAllBookings(bookingsData);

        const resData = await api.getResources({ all: true });
        setResources(resData);
      }
    } catch (err: any) {
      onNotify(err.response?.data?.message || 'Access Denied: Backend rejected request', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.role, statusFilter, activeTab]);

  const handleAdminCancel = async (bookingId: string) => {
    if (!window.confirm('Admin Override: Are you sure you want to cancel this employee reservation?')) return;
    try {
      await api.cancelBooking(bookingId);
      onNotify('Admin override: Booking cancelled', 'success');
      fetchData();
    } catch (err: any) {
      onNotify(err.response?.data?.message || 'Admin cancellation failed', 'error');
    }
  };

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRes(true);
    try {
      await api.createResource({
        name: newResName,
        type: newResType,
        capacity: Number(newResCapacity),
        location: newResLocation,
        description: newResDesc || undefined
      });
      onNotify(`Resource "${newResName}" created successfully!`, 'success');
      setShowAddResource(false);
      setNewResName('');
      setNewResLocation('');
      setNewResDesc('');
      fetchData();
    } catch (err: any) {
      onNotify(err.response?.data?.message || 'Failed to create resource', 'error');
    } finally {
      setSubmittingRes(false);
    }
  };

  const handleToggleResourceActive = async (res: Resource) => {
    const nextState = res.is_active === 1 ? 0 : 1;
    try {
      await api.updateResource(res.id, { is_active: nextState });
      onNotify(`Resource ${nextState === 1 ? 'activated' : 'deactivated'}`, 'success');
      fetchData();
    } catch (err: any) {
      onNotify(err.response?.data?.message || 'Failed to update resource', 'error');
    }
  };

  // If standard user visits the page
  if (!isAdmin) {
    return (
      <div className="bg-white rounded-3xl border border-rose-200 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">403 Forbidden: Administrator Privileges Required</h2>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          You are currently authenticated as <strong className="text-slate-800">{user?.name}</strong> with role{' '}
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-xs font-semibold">
            {user?.role}
          </span>
          .
        </p>
        <p className="text-xs text-slate-500 mt-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <strong>Security Requirement Verification:</strong> Admin privileges are strictly validated against cryptographically signed JWT claims on the backend. Switch your persona in the top navigation bar to <strong>"Admin (Alice)"</strong> to access this dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Admin Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Administrator Console
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-2">Enterprise Space Management</h1>
          <p className="text-xs text-purple-200 mt-1">
            Global access to all user bookings, schedule overrides, and facility asset catalog.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'bookings'
                ? 'bg-white text-purple-950 shadow-md'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            All Bookings ({allBookings.length})
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'resources'
                ? 'bg-white text-purple-950 shadow-md'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            Manage Catalog ({resources.length})
          </button>
        </div>
      </div>

      {/* Tab 1: All Company Bookings */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          
          {/* Filter Bar */}
          <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider pl-2">Filter:</span>
              {['ALL', 'CONFIRMED', 'CANCELLED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === st
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <button
              onClick={fetchData}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
            </button>
          </div>

          {/* Bookings Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Resource</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Scheduled Interval (Local)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Purpose</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allBookings.map((b) => {
                    const range = formatBookingRange(b.start_time, b.end_time);
                    const isConfirmed = b.status === 'CONFIRMED';

                    return (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{b.resource_name}</div>
                          <div className="text-[11px] text-slate-500">{b.resource_location}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            {b.user_name || b.user_id}
                          </div>
                          <div className="text-[11px] text-slate-500">{b.user_email}</div>
                        </td>

                        <td className="py-3.5 px-4 font-mono">
                          <div className="font-semibold text-slate-800">{range.date}</div>
                          <div className="text-[11px] text-slate-500">{range.time}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          {isConfirmed ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              CONFIRMED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 font-semibold inline-flex items-center gap-1">
                              CANCELLED
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                          {b.purpose || '—'}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {isConfirmed && (
                            <button
                              onClick={() => handleAdminCancel(b.id)}
                              className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 font-semibold transition-colors"
                            >
                              Cancel Override
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
        </div>
      )}

      {/* Tab 2: Manage Catalog Resources */}
      {activeTab === 'resources' && (
        <div className="space-y-4">
          
          {/* Top Bar with Add Button */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Workspace Assets Catalog</h2>
            <button
              onClick={() => setShowAddResource(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Resource
            </button>
          </div>

          {/* Add Resource Modal / Drawer */}
          {showAddResource && (
            <div className="bg-white rounded-2xl border border-purple-200 p-5 shadow-lg animate-in fade-in">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Create New Bookable Asset</h3>
              <form onSubmit={handleCreateResource} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Asset Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Focus Pod 302"
                    value={newResName}
                    onChange={(e) => setNewResName(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Type</label>
                  <select
                    value={newResType}
                    onChange={(e) => setNewResType(e.target.value as ResourceType)}
                    className="w-full p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    <option value="MEETING_ROOM">Meeting Room</option>
                    <option value="DESK">Desk</option>
                    <option value="EQUIPMENT">Equipment</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Capacity</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newResCapacity}
                    onChange={(e) => setNewResCapacity(parseInt(e.target.value, 10))}
                    className="w-full p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Location / Zone</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Floor 3, Quiet Wing"
                    value={newResLocation}
                    onChange={(e) => setNewResLocation(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Description / Amenities</label>
                  <input
                    type="text"
                    placeholder="e.g. Standing desk with dual USB-C hubs"
                    value={newResDesc}
                    onChange={(e) => setNewResDesc(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddResource(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRes}
                    className="px-4 py-1.5 rounded-lg bg-purple-600 text-white font-semibold shadow-sm hover:bg-purple-700"
                  >
                    {submittingRes ? 'Saving...' : 'Save Asset'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Resources Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((r) => (
              <div key={r.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {r.type}
                    </span>
                    <button
                      onClick={() => handleToggleResourceActive(r)}
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        r.is_active === 1
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {r.is_active === 1 ? 'Active' : 'Deactivated'}
                    </button>
                  </div>
                  <h4 className="font-bold text-slate-900">{r.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{r.location} (Capacity: {r.capacity})</p>
                  {r.description && <p className="text-xs text-slate-600 mt-2 line-clamp-2">{r.description}</p>}
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  );
};
