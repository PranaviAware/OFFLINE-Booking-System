import React, { useState, useEffect, useCallback } from 'react';
import { Resource, ResourceType } from '../types';
import { api } from '../api/client';
import { ResourceCard } from '../components/ResourceCard';
import { BookingModal } from '../components/BookingModal';
import { Search, X } from 'lucide-react';

interface CatalogPageProps {
  onNotify: (msg: string, type: 'success' | 'error') => void;
}

const FILTERS = [
  { id: 'ALL', label: 'All Resources' },
  { id: 'MEETING_ROOM', label: 'Meeting Rooms' },
  { id: 'DESK', label: 'Desks' },
  { id: 'EQUIPMENT', label: 'Equipment' },
] as const;

export const CatalogPage: React.FC<CatalogPageProps> = ({ onNotify }) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  const fetchResources = useCallback(async (type: string, search: string) => {
    setLoading(true);
    try {
      const typeParam = type === 'ALL' ? undefined : (type as ResourceType);
      const data = await api.getResources({
        type: typeParam,
        search: search.trim() || undefined
      });
      setResources(data);
    } catch {
      onNotify('Failed to load resources', 'error');
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  // When type filter changes: clear search term AND re-fetch
  const handleFilterChange = (newFilter: string) => {
    setTypeFilter(newFilter);
    setSearchTerm('');
    fetchResources(newFilter, '');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchResources(typeFilter, searchTerm);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    fetchResources(typeFilter, '');
  };

  useEffect(() => {
    fetchResources('ALL', '');
  }, []);

  const availableCount = resources.filter(r => r.is_currently_available !== false).length;
  const inUseCount = resources.length - availableCount;

  return (
    <div className="space-y-5">

      {/* Title & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Workspaces &amp; Equipment</h1>
          <p className="text-xs text-slate-500">Select a resource to check availability and book a slot.</p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-7 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-kpit-green w-56"
            />
            {searchTerm && (
              <button type="button" onClick={handleClearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-800 text-white rounded-md text-xs font-semibold hover:bg-slate-900 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs">
        {FILTERS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleFilterChange(tab.id)}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors whitespace-nowrap ${
              typeFilter === tab.id
                ? 'bg-kpit-purple text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}

        {/* Live availability summary */}
        {!loading && resources.length > 0 && (
          <div className="ml-auto flex items-center gap-3 text-[11px] text-slate-500 shrink-0">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {availableCount} available
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              {inUseCount} in use
            </span>
          </div>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="h-1.5 bg-slate-200 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 w-24 bg-slate-200 rounded-full animate-pulse" />
                  <div className="h-4 w-10 bg-slate-200 rounded animate-pulse" />
                </div>
                <div className="h-5 w-3/4 bg-slate-200 rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
              </div>
              <div className="px-4 pb-4 pt-2 border-t border-slate-100 flex justify-between">
                <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                <div className="h-7 w-20 bg-slate-200 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : resources.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-slate-400 text-sm">No resources found.</p>
          {searchTerm && (
            <button onClick={handleClearSearch} className="mt-2 text-xs text-kpit-green hover:underline">
              Clear search
            </button>
          )}
        </div>
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
            fetchResources(typeFilter, searchTerm);
          }}
        />
      )}
    </div>
  );
};
