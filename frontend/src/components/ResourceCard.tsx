import React from 'react';
import { Resource, ResourceType } from '../types';
import { Users, MapPin, Monitor, Laptop, CalendarPlus } from 'lucide-react';

interface ResourceCardProps {
  resource: Resource;
  onBook: (resource: Resource) => void;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({ resource, onBook }) => {
  const getBadgeDetails = (type: ResourceType) => {
    switch (type) {
      case 'MEETING_ROOM':
        return {
          icon: <Users className="w-4 h-4" />,
          label: 'Meeting Room',
          badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200'
        };
      case 'DESK':
        return {
          icon: <Laptop className="w-4 h-4" />,
          label: 'Desk',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        };
      case 'EQUIPMENT':
        return {
          icon: <Monitor className="w-4 h-4" />,
          label: 'Equipment',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
        };
    }
  };

  const badge = getBadgeDetails(resource.type);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between group">
      <div>
        {/* Header: Type Badge & Status */}
        <div className="flex items-center justify-between mb-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.badgeClass}`}>
            {badge.icon}
            {badge.label}
          </span>
          <span className="text-xs text-slate-500 font-medium">
            Capacity: <strong className="text-slate-800">{resource.capacity} {resource.capacity > 1 ? 'people' : 'person'}</strong>
          </span>
        </div>

        {/* Name */}
        <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-600 transition-colors">
          {resource.name}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{resource.location}</span>
        </div>

        {/* Description */}
        {resource.description && (
          <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">
            {resource.description}
          </p>
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Available for reservation
        </span>

        <button
          onClick={() => onBook(resource)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          <CalendarPlus className="w-3.5 h-3.5" />
          Book Slot
        </button>
      </div>
    </div>
  );
};
