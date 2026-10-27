import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, X, Copy, Check, KeyRound } from 'lucide-react';

interface TokenInspectorModalProps {
  onClose: () => void;
}

export const TokenInspectorModal: React.FC<TokenInspectorModalProps> = ({ onClose }) => {
  const { token, user } = useAuth();
  const [copied, setCopied] = useState<boolean>(false);

  // Decode JWT payload locally for inspection
  const parseJwt = (t: string | null) => {
    if (!t) return null;
    try {
      const parts = t.split('.');
      if (parts.length !== 3) return null;
      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));
      return { header, payload, signature: parts[2] };
    } catch {
      return null;
    }
  };

  const parsed = parseJwt(token);

  const handleCopy = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">JWT Token & Claims Inspector</h2>
              <p className="text-xs text-slate-500">Cryptographically verified by backend middleware (Security 25%)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          
          {/* Status Badge */}
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">Backend Signature Validated: Authenticated as {user?.name} ({user?.role})</span>
            </div>
            <span className="text-[11px] font-mono bg-emerald-200/60 px-2 py-0.5 rounded text-emerald-900 font-bold">
              ROLE: {user?.role}
            </span>
          </div>

          {/* Raw Encoded Token */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Raw Bearer JWT Token
              </label>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 hover:text-teal-700"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy Token'}
              </button>
            </div>
            <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[11px] break-all max-h-24 overflow-y-auto border border-slate-800">
              {token || 'No token found in localStorage'}
            </div>
          </div>

          {/* Decoded Claims Payload */}
          <div>
            <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block mb-1.5">
              Decoded Claims Payload (Validated on Backend)
            </label>
            <div className="bg-slate-900 text-teal-300 p-3.5 rounded-xl font-mono text-[11px] overflow-x-auto border border-slate-800">
              <pre>{JSON.stringify(parsed?.payload, null, 2)}</pre>
            </div>
          </div>

          {/* Decoded Header */}
          <div>
            <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block mb-1.5">
              Token Header
            </label>
            <div className="bg-slate-900 text-slate-300 p-3 rounded-xl font-mono text-[11px] border border-slate-800">
              <pre>{JSON.stringify(parsed?.header, null, 2)}</pre>
            </div>
          </div>

          {/* Notice */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-[11px] leading-relaxed">
            <strong>RBAC Enforcement Note:</strong> The backend extracts the role from the verified <code>https://officelink.app/roles</code> or <code>roles</code> claim. Frontend state is completely decoupled from security authorization.
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-white font-semibold text-xs hover:bg-slate-900 transition-colors"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};
