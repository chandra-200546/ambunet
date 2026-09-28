import React, { useState } from 'react';
import { X, Copy, Check, Share2, QrCode, ExternalLink } from 'lucide-react';

interface ShareTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  emergencyId: string;
}

export const ShareTrackingModal: React.FC<ShareTrackingModalProps> = ({
  isOpen,
  onClose,
  emergencyId
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const trackingUrl = `${window.location.origin}/#/track/${emergencyId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(trackingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'AmbuNet Emergency Live Rescue Tracking',
        text: 'Track our ambulance rescue in real time on AmbuNet:',
        url: trackingUrl
      }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 bg-sky-500/20 text-sky-400 rounded-2xl flex items-center justify-center border border-sky-500/30">
            <Share2 className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-white">Share Live Tracking with Family</h3>
          <p className="text-xs text-slate-400 mt-1">
            Anyone with this link can view the live ambulance GPS location and ETA in real time without creating an account.
          </p>
        </div>

        {/* QR Code Illustration & Link Box */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col items-center gap-3 mb-5">
          <div className="p-3 bg-white rounded-xl shadow-inner flex items-center justify-center">
            {/* SVG stylized QR code */}
            <svg width="120" height="120" viewBox="0 0 24 24" fill="#0f172a">
              <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h4v2h-4v-2zm-4-2h2v4h-2v-4zm6 6h2v2h-2v-2zm-6-2h4v2h-4v-2zm2 4h4v2h-4v-2zm-4-2h2v4h-2v-4zm4-4h2v2h-2v-2z" />
            </svg>
          </div>

          <div className="w-full flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2">
            <input
              type="text"
              readOnly
              value={trackingUrl}
              className="bg-transparent text-xs text-slate-300 w-full outline-none select-all font-mono"
            />
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 transition"
              title="Copy link"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition border border-slate-700"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" /> Link Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Copy URL
              </>
            )}
          </button>

          <button
            onClick={handleNativeShare}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl text-xs shadow-lg transition"
          >
            <Share2 className="w-4 h-4" /> Share Directly
          </button>
        </div>
      </div>
    </div>
  );
};
