import React from 'react';
import { Resource } from '../types';
import { Users, MapPin, Zap, MonitorSpeaker, DoorOpen } from 'lucide-react';

interface ResourceCardProps {
  resource: Resource;
  onBook: (resource: Resource) => void;
}

const typeConfig = {
  MEETING_ROOM: {
    label: 'Meeting Room',
    icon: DoorOpen,
    badgeClass: 'bg-purple-100 text-purple-700',
  },
  DESK: {
    label: 'Desk',
    icon: MonitorSpeaker,
    badgeClass: 'bg-emerald-100 text-emerald-700',
  },
  EQUIPMENT: {
    label: 'Equipment',
    icon: Zap,
    badgeClass: 'bg-amber-100 text-amber-700',
  },
};

export const ResourceCard: React.FC<ResourceCardProps> = ({ resource, onBook }) => {
  const config = typeConfig[resource.type] || {
    label: resource.type,
    icon: MonitorSpeaker,
    badgeClass: 'bg-slate-100 text-slate-700',
  };
  const Icon = config.icon;

  // Use the real availability from the backend — default to true if not present (backward compat)
  const isAvailable = resource.is_currently_available !== false;

  return (
    <div
      className={`bg-white rounded-xl border shadow-sm flex flex-col justify-between transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
        isAvailable ? 'border-slate-200 hover:border-kpit-green' : 'border-slate-200 opacity-80'
      }`}
    >
      {/* Card top — type icon accent strip */}
      <div className={`h-1.5 rounded-t-xl ${isAvailable ? 'bg-kpit-green' : 'bg-slate-300'}`} />

      <div className="p-4">
        {/* Type badge + capacity */}
        <div className="flex items-center justify-between mb-3">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${config.badgeClass}`}>
            <Icon className="w-3 h-3" />
            {config.label}
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Users className="w-3.5 h-3.5" />
            {resource.capacity}
          </span>
        </div>

        <h3 className="font-bold text-slate-900 text-base leading-tight mb-1">{resource.name}</h3>
        <p className="flex items-center gap-1 text-xs text-slate-500 mb-2">
          <MapPin className="w-3 h-3 shrink-0" />
          {resource.location}
        </p>

        {resource.description && (
          <p className="text-xs text-slate-600 line-clamp-2 mt-1">{resource.description}</p>
        )}
      </div>

      {/* Card footer */}
      <div className="px-4 pb-4 pt-2 border-t border-slate-100 flex items-center justify-between">
        {/* Real-time availability indicator */}
        {isAvailable ? (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Available now
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-orange-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            In use now
          </span>
        )}

        <button
          onClick={() => onBook(resource)}
          className="px-3 py-1.5 rounded-lg bg-kpit-green hover:bg-kpit-greenHover text-white text-xs font-semibold transition-colors shadow-sm"
        >
          Book Slot
        </button>
      </div>
    </div>
  );
};
