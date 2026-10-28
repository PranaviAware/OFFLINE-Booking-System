import React, { useState, useEffect, useCallback } from 'react';
import { Booking, Resource, ResourceType } from '../types';
import { api, AdminStats } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatBookingRange, isBookingPast } from '../utils/dateUtils';
import {
  Users, LayoutGrid, CalendarCheck, Activity, Pencil, Trash2,
  ChevronUp, ChevronDown, Plus, X, Save, AlertTriangle, TrendingUp, Info
} from 'lucide-react';

interface AdminDashboardPageProps {
  onNotify: (msg: string, type: 'success' | 'error') => void;
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  created_at: string;
}

type ActiveTab = 'overview' | 'bookings' | 'resources' | 'users';

// ─── Tiny confirm modal ───────────────────────────────────────────────────────
const ConfirmModal: React.FC<{
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ title, message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
    <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{message}</p>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
        <button onClick={onConfirm} className="px-3.5 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">Confirm</button>
      </div>
    </div>
  </div>
);

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard: React.FC<{ label: string; value: number | string; icon: React.ReactNode; color: string; sub?: string }> = ({ label, value, icon, color, sub }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ─── Overview Tab ─────────────────────────────────────────────────────────────
const OverviewTab: React.FC<{ stats: AdminStats | null; loading: boolean }> = ({ stats, loading }) => {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats.totalUsers} icon={<Users className="w-5 h-5 text-purple-600" />} color="bg-purple-100" />
        <StatCard label="Active Resources" value={stats.totalResources} icon={<LayoutGrid className="w-5 h-5 text-emerald-600" />} color="bg-emerald-100" />
        <StatCard label="All-Time Bookings" value={stats.totalBookings} icon={<CalendarCheck className="w-5 h-5 text-blue-600" />} color="bg-blue-100" />
        <StatCard label="Active Right Now" value={stats.activeNow} icon={<Activity className="w-5 h-5 text-orange-500" />} color="bg-orange-100" sub={`${stats.todayBookings} booked today`} />
      </div>

      {/* Top resources */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-kpit-purple" />
          <h3 className="font-bold text-slate-800 text-sm">Most Booked Resources</h3>
        </div>
        <div className="space-y-2">
          {stats.topResources.map((r, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-slate-400 w-4">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-semibold text-slate-800 truncate">{r.name}</span>
                  <span className="text-xs font-bold text-slate-600 ml-2">{r.booking_count}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-kpit-green rounded-full transition-all"
                    style={{ width: `${stats.topResources[0].booking_count > 0 ? (r.booking_count / stats.topResources[0].booking_count) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
          {stats.topResources.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">No booking data yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Bookings Tab ─────────────────────────────────────────────────────────────
const BookingsTab: React.FC<{
  bookings: Booking[];
  loading: boolean;
  onCancel: (id: string) => void;
}> = ({ bookings, loading, onCancel }) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONFIRMED' | 'CANCELLED'>('ALL');
  const filtered = bookings.filter(b => statusFilter === 'ALL' || b.status === statusFilter);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {(['ALL', 'CONFIRMED', 'CANCELLED'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${statusFilter === s ? 'bg-kpit-purple text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {s === 'ALL' ? `All (${bookings.length})` : s === 'CONFIRMED' ? `Confirmed (${bookings.filter(b => b.status === 'CONFIRMED').length})` : `Cancelled (${bookings.filter(b => b.status === 'CANCELLED').length})`}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-4 space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">No bookings found.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Resource</th>
                  <th className="py-2.5 px-3">Booked By</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Purpose</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((b) => {
                  const range = formatBookingRange(b.start_time, b.end_time);
                  const isConfirmed = b.status === 'CONFIRMED';
                  const isPast = isBookingPast(b.end_time);
                  return (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{b.resource_name}</td>
                      <td className="py-2.5 px-3 text-slate-700">{b.user_name || b.user_id}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{range.date} ({range.time})</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          !isConfirmed ? 'bg-slate-100 text-slate-500' :
                          isPast ? 'bg-blue-100 text-blue-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {!isConfirmed ? 'CANCELLED' : isPast ? 'COMPLETED' : 'CONFIRMED'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">{b.purpose || '—'}</td>
                      <td className="py-2.5 px-3 text-right">
                        {isConfirmed && !isPast && (
                          <button onClick={() => onCancel(b.id)}
                            className="px-2 py-1 text-[11px] font-semibold border border-red-300 text-red-600 hover:bg-red-50 rounded">
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Resources Tab ────────────────────────────────────────────────────────────
const ResourcesTab: React.FC<{
  resources: Resource[];
  loading: boolean;
  onRefresh: () => void;
  onNotify: (msg: string, type: 'success' | 'error') => void;
}> = ({ resources, loading, onRefresh, onNotify }) => {
  const [showForm, setShowForm] = useState(false);
  const [editResource, setEditResource] = useState<Resource | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Resource | null>(null);

  // Form state
  const [resName, setResName] = useState('');
  const [resType, setResType] = useState<ResourceType>('MEETING_ROOM');
  const [resCapacity, setResCapacity] = useState(4);
  const [resLocation, setResLocation] = useState('');
  const [resDescription, setResDescription] = useState('');

  const openCreate = () => {
    setEditResource(null);
    setResName(''); setResType('MEETING_ROOM'); setResCapacity(4); setResLocation(''); setResDescription('');
    setShowForm(true);
  };

  const openEdit = (r: Resource) => {
    setEditResource(r);
    setResName(r.name); setResType(r.type); setResCapacity(r.capacity);
    setResLocation(r.location); setResDescription(r.description || '');
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editResource) {
        await api.updateResource(editResource.id, { name: resName, type: resType, capacity: resCapacity, location: resLocation, description: resDescription || undefined });
        onNotify(`Resource "${resName}" updated`, 'success');
      } else {
        await api.createResource({ name: resName, type: resType, capacity: resCapacity, location: resLocation, description: resDescription || undefined });
        onNotify(`Resource "${resName}" added`, 'success');
      }
      setShowForm(false);
      onRefresh();
    } catch (err: any) {
      onNotify(err.response?.data?.message || 'Operation failed', 'error');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.deleteResource(confirmDelete.id);
      onNotify(`Resource "${confirmDelete.name}" deactivated`, 'success');
      setConfirmDelete(null);
      onRefresh();
    } catch (err: any) {
      onNotify(err.response?.data?.message || 'Delete failed', 'error');
    }
  };

  const typeColors: Record<string, string> = {
    MEETING_ROOM: 'bg-purple-100 text-purple-700',
    DESK: 'bg-emerald-100 text-emerald-700',
    EQUIPMENT: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-kpit-green hover:bg-kpit-greenHover text-white text-xs font-semibold rounded-md shadow-sm transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add New Resource
        </button>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900 text-sm">{editResource ? `Edit: ${editResource.name}` : 'New Resource'}</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSave} className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">Name</label>
              <input required value={resName} onChange={e => setResName(e.target.value)} placeholder="e.g. Focus Room C" className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:border-kpit-green" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Type</label>
              <select value={resType} onChange={e => setResType(e.target.value as ResourceType)} className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-kpit-green">
                <option value="MEETING_ROOM">Meeting Room</option>
                <option value="DESK">Desk</option>
                <option value="EQUIPMENT">Equipment</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Capacity</label>
              <input type="number" min={1} required value={resCapacity} onChange={e => setResCapacity(Number(e.target.value))} className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:border-kpit-green" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Location</label>
              <input required value={resLocation} onChange={e => setResLocation(e.target.value)} placeholder="e.g. Floor 2, East" className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:border-kpit-green" />
            </div>
            <div className="col-span-2">
              <label className="block font-semibold mb-1">Description (Optional)</label>
              <input value={resDescription} onChange={e => setResDescription(e.target.value)} placeholder="e.g. Dual monitors, whiteboard" className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:border-kpit-green" />
            </div>
            <div className="col-span-2 flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 border border-slate-300 rounded-md text-slate-600 text-xs hover:bg-slate-50">Cancel</button>
              <button type="submit" className="flex items-center gap-1.5 px-4 py-1.5 bg-kpit-green hover:bg-kpit-greenHover text-white font-semibold rounded-md text-xs">
                <Save className="w-3.5 h-3.5" /> {editResource ? 'Save Changes' : 'Add Resource'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-white border border-slate-200 rounded-lg animate-pulse" />)}
        </div>
      ) : resources.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-400">No resources found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {resources.map(r => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm text-xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-slate-900 text-sm">{r.name}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${typeColors[r.type] || 'bg-slate-100 text-slate-700'}`}>
                    {r.type.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-slate-500">{r.location} · Cap: {r.capacity}</p>
                {r.description && <p className="text-slate-500 mt-1 line-clamp-1">{r.description}</p>}
                <span className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${r.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                  {r.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex gap-2 mt-3 pt-2.5 border-t border-slate-100">
                <button onClick={() => openEdit(r)}
                  className="flex-1 flex items-center justify-center gap-1 py-1 border border-slate-300 rounded-md text-slate-600 hover:bg-slate-50 text-xs font-medium">
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                <button onClick={() => setConfirmDelete(r)}
                  className="flex-1 flex items-center justify-center gap-1 py-1 border border-red-200 rounded-md text-red-600 hover:bg-red-50 text-xs font-medium">
                  <Trash2 className="w-3 h-3" /> Deactivate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Deactivate Resource?"
          message={`"${confirmDelete.name}" will be deactivated and no longer bookable. Existing bookings are unaffected.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
};

// ─── Users Tab ────────────────────────────────────────────────────────────────
const UsersTab: React.FC<{
  users: UserRecord[];
  loading: boolean;
  currentUserId: string;
  onRefresh: () => void;
  onNotify: (msg: string, type: 'success' | 'error') => void;
}> = ({ users, loading, currentUserId, onRefresh, onNotify }) => {
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<UserRecord | null>(null);
  const [roleChanging, setRoleChanging] = useState<string | null>(null);

  // Add user form state
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('User@123');
  const [userRole, setUserRole] = useState<'ADMIN' | 'USER'>('USER');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser({ fullName: userName, email: userEmail, password: userPassword, role: userRole });
      onNotify(`User "${userName}" created with role ${userRole}`, 'success');
      setShowForm(false);
      setUserName(''); setUserEmail(''); setUserPassword('User@123'); setUserRole('USER');
      onRefresh();
    } catch (err: any) {
      onNotify(err.response?.data?.message || 'Failed to create user', 'error');
    }
  };

  const handleToggleRole = async (u: UserRecord) => {
    const newRole = u.role === 'ADMIN' ? 'USER' : 'ADMIN';
    setRoleChanging(u.id);
    try {
      await api.updateUserRole(u.id, newRole);
      onNotify(`${u.name}'s role changed to ${newRole}`, 'success');
      onRefresh();
    } catch (err: any) {
      onNotify(err.response?.data?.message || 'Role update failed', 'error');
    } finally {
      setRoleChanging(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.deleteUser(confirmDelete.id);
      onNotify(`User "${confirmDelete.name}" deleted`, 'success');
      setConfirmDelete(null);
      onRefresh();
    } catch (err: any) {
      onNotify(err.response?.data?.message || 'Delete failed', 'error');
    }
  };

  return (
    <div className="space-y-3">
      <div className="bg-amber-50 border border-amber-200/80 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">Keycloak Single Sign-On (SSO):</span> User authentication and primary roles are centrally managed via Keycloak realm <code>officelink</code>. When employees register or log in, their profiles and roles are automatically synchronized into this system (JIT provisioning).
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Only admins can manage user records and role privileges.</p>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-kpit-green hover:bg-kpit-greenHover text-white text-xs font-semibold rounded-md shadow-sm">
          <Plus className="w-3.5 h-3.5" /> Add Employee
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900 text-sm">Create User Account</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">Full Name</label>
              <input required value={userName} onChange={e => setUserName(e.target.value)} placeholder="e.g. David Miller" className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:border-kpit-green" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Work Email</label>
              <input type="email" required value={userEmail} onChange={e => setUserEmail(e.target.value)} placeholder="david@kpit.com" className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:border-kpit-green" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Initial Password</label>
              <input type="password" required value={userPassword} onChange={e => setUserPassword(e.target.value)} className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono focus:outline-none focus:border-kpit-green" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Assigned Role</label>
              <select value={userRole} onChange={e => setUserRole(e.target.value as 'ADMIN' | 'USER')} className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-kpit-green">
                <option value="USER">USER — Booking Only</option>
                <option value="ADMIN">ADMIN — Full Access</option>
              </select>
            </div>
            <div className="col-span-2 flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 border border-slate-300 rounded-md text-slate-600 hover:bg-slate-50 text-xs">Cancel</button>
              <button type="submit" className="flex items-center gap-1.5 px-4 py-1.5 bg-kpit-green text-white font-semibold rounded-md text-xs">
                <Plus className="w-3.5 h-3.5" /> Create User
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />)}</div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Employee</th>
                <th className="py-2.5 px-3">Email</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    {u.name}
                    {u.id === currentUserId && <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-600 px-1 rounded font-bold">You</span>}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{u.email}</td>
                  <td className="py-2.5 px-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${u.role === 'ADMIN' ? 'bg-purple-100 text-kpit-purple' : 'bg-emerald-100 text-emerald-800'}`}>
                      {u.role === 'ADMIN' ? '👑 ADMIN' : '👤 USER'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {u.id !== currentUserId && (
                        <>
                          <button
                            onClick={() => handleToggleRole(u)}
                            disabled={roleChanging === u.id}
                            className="flex items-center gap-1 px-2 py-1 border border-slate-300 rounded text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                          >
                            {u.role === 'ADMIN' ? <><ChevronDown className="w-3 h-3" /> Demote</> : <><ChevronUp className="w-3 h-3" /> Promote</>}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(u)}
                            className="flex items-center gap-1 px-2 py-1 border border-red-200 rounded text-[11px] font-semibold text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirmDelete && (
        <ConfirmModal
          title="Delete User Account?"
          message={`This will permanently delete "${confirmDelete.name}"'s account and all their bookings will be orphaned.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
};

// ─── Main Admin Dashboard ─────────────────────────────────────────────────────
export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onNotify }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  // Per-tab data fetching — only loads what's needed
  const loadTabData = useCallback(async (tab: ActiveTab) => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      if (tab === 'overview') {
        const s = await api.getAdminStats();
        setStats(s);
      } else if (tab === 'bookings') {
        const b = await api.getAllBookingsAdmin();
        setAllBookings(b);
      } else if (tab === 'resources') {
        const r = await api.getResources({ all: true });
        setResources(r);
      } else if (tab === 'users') {
        const u = await api.getUsers();
        setUsersList(u);
      }
    } catch {
      onNotify('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, onNotify]);

  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab]);

  const handleAdminCancel = async () => {
    if (!confirmCancelId) return;
    try {
      await api.cancelBooking(confirmCancelId);
      onNotify('Booking cancelled by Admin', 'success');
      setConfirmCancelId(null);
      const b = await api.getAllBookingsAdmin();
      setAllBookings(b);
    } catch (err: any) {
      onNotify(err.response?.data?.message || 'Cancel failed', 'error');
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-8 text-center max-w-lg mx-auto">
        <h2 className="text-base font-bold text-red-600 mb-1">Access Restricted</h2>
        <p className="text-xs text-slate-600">
          You are signed in as <strong>{user?.name}</strong> ({user?.role}). Only administrators can view this page.
        </p>
      </div>
    );
  }

  const TABS: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'bookings', label: `Bookings${allBookings.length ? ` (${allBookings.length})` : ''}`, icon: <CalendarCheck className="w-3.5 h-3.5" /> },
    { id: 'resources', label: `Resources${resources.length ? ` (${resources.length})` : ''}`, icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { id: 'users', label: `Users${usersList.length ? ` (${usersList.length})` : ''}`, icon: <Users className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-kpit-purple">Admin Management Console</h1>
          <p className="text-xs text-slate-500">Manage bookings, workspace resources, and employee access.</p>
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === tab.id ? 'bg-kpit-purple text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}>
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab stats={stats} loading={loading} />}
      {activeTab === 'bookings' && (
        <BookingsTab
          bookings={allBookings}
          loading={loading}
          onCancel={setConfirmCancelId}
        />
      )}
      {activeTab === 'resources' && (
        <ResourcesTab
          resources={resources}
          loading={loading}
          onRefresh={() => loadTabData('resources')}
          onNotify={onNotify}
        />
      )}
      {activeTab === 'users' && (
        <UsersTab
          users={usersList}
          loading={loading}
          currentUserId={user?.id || ''}
          onRefresh={() => loadTabData('users')}
          onNotify={onNotify}
        />
      )}

      {/* Admin cancel confirm */}
      {confirmCancelId && (
        <ConfirmModal
          title="Admin Override: Cancel Booking?"
          message="This will cancel the selected booking on behalf of the employee."
          onConfirm={handleAdminCancel}
          onCancel={() => setConfirmCancelId(null)}
        />
      )}
    </div>
  );
};
