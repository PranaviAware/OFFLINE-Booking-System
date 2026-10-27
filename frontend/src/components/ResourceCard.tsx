import React from 'react';
import { Resource } from '../types';

interface ResourceCardProps {
  resource: Resource;
  onBook: (resource: Resource) => void;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({ resource, onBook }) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'MEETING_ROOM':
        return 'bg-purple-100 text-kpit-purple';
      case 'DESK':
        return 'bg-emerald-100 text-emerald-800';
      case 'EQUIPMENT':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:border-kpit-green transition-colors flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${getTypeColor(resource.type)}`}>
            {resource.type.replace('_', ' ')}
          </span>
          <span className="text-xs text-slate-500">
            Capacity: {resource.capacity}
          </span>
        </div>

        <h3 className="font-bold text-slate-900 text-base">{resource.name}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{resource.location}</p>

        {resource.description && (
          <p className="text-xs text-slate-600 mt-2 line-clamp-2">{resource.description}</p>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-emerald-600 font-medium">● Available</span>
        <button
          onClick={() => onBook(resource)}
          className="px-3 py-1.5 rounded-md bg-kpit-green hover:bg-kpit-greenHover text-white text-xs font-semibold transition-colors shadow-sm"
        >
          Book Slot
        </button>
      </div>
    </div>
  );
};
