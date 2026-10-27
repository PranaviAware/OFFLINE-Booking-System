import React, { useState, useEffect } from 'react';
import { Resource, ResourceType } from '../types';
import { api } from '../api/client';
import { ResourceCard } from '../components/ResourceCard';
import { BookingModal } from '../components/BookingModal';

interface CatalogPageProps {
  onNotify: (msg: string, type: 'success' | 'error') => void;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({ onNotify }) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const typeParam = typeFilter === 'ALL' ? undefined : (typeFilter as ResourceType);
      const data = await api.getResources({
        type: typeParam,
        search: searchTerm.trim() || undefined
      });
      setResources(data);
    } catch {
      onNotify('Failed to load resources', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchResources();
  };

  return (
    <div className="space-y-5">
      
      {/* Title & Search / Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Workspaces & Equipment</h1>
          <p className="text-xs text-slate-500">Select a resource to check availability and book a slot.</p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Search by name or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-kpit-green w-56"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-800 text-white rounded-md text-xs font-semibold hover:bg-slate-900"
          >
            Search
          </button>
        </form>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs">
        {[
          { id: 'ALL', label: 'All Resources' },
          { id: 'MEETING_ROOM', label: 'Meeting Rooms' },
          { id: 'DESK', label: 'Desks' },
          { id: 'EQUIPMENT', label: 'Equipment' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTypeFilter(tab.id)}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              typeFilter === tab.id
                ? 'bg-kpit-purple text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">Loading resources...</div>
      ) : resources.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500">No resources found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((res) => (
            <ResourceCard
              key={res.id}
              resource={res}
              onBook={(r) => setSelectedResource(r)}
            />
          ))}
        </div>
      )}

      {/* Booking Modal */}
      {selectedResource && (
        <BookingModal
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
          onSuccess={(msg) => {
            onNotify(msg, 'success');
            fetchResources();
          }}
        />
      )}

    </div>
  );
};
