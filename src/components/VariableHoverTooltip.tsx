import React, { useState } from 'react';
import { VariableResolutionInfo } from '../utils/variables';
import { Copy, Check, AlertCircle, ExternalLink, Sparkles, Globe, Layers } from 'lucide-react';

interface VariableHoverTooltipProps {
  info: VariableResolutionInfo;
  x: number;
  y: number;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onOpenEnvModal?: () => void;
}

export const VariableHoverTooltip: React.FC<VariableHoverTooltipProps> = ({
  info,
  x,
  y,
  onMouseEnter,
  onMouseLeave,
  onOpenEnvModal,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (info.isResolved && info.value) {
      navigator.clipboard.writeText(info.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  // Clamp x position so tooltip stays within the window
  const tooltipWidth = 320;
  const clampedX = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, x - tooltipWidth / 2));

  const getSourceIcon = () => {
    switch (info.source) {
      case 'dynamic':
        return <Sparkles className="w-3 h-3 text-orange-400" />;
      case 'global':
        return <Globe className="w-3 h-3 text-sky-400" />;
      case 'environment':
        return <Layers className="w-3 h-3 text-emerald-400" />;
      default:
        return <AlertCircle className="w-3 h-3 text-rose-400" />;
    }
  };

  return (
    <div
      style={{ left: `${clampedX}px`, top: `${y}px` }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="fixed z-50 w-80 bg-[#222224] border border-[#333333] rounded-md shadow-2xl p-3 text-xs text-[#cccccc] backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#333333]">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono font-bold text-[#d99b26] text-xs truncate">
            {`{{${info.name}}}`}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {info.isResolved ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Resolved
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
              Unresolved
            </span>
          )}
        </div>
      </div>

      {/* Value Content */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-medium text-[#888888] uppercase tracking-wider">
          <span>Actual Value</span>
          {info.isResolved && (
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 text-[10px] text-[#888888] hover:text-white transition-colors cursor-pointer"
              title="Copy resolved value"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-sans normal-case">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span className="font-sans normal-case">Copy</span>
                </>
              )}
            </button>
          )}
        </div>

        {info.isResolved ? (
          <div className="bg-[#1a1a1a] border border-[#333333] rounded p-2 text-xs font-mono text-[#cccccc] break-all max-h-28 overflow-y-auto select-text">
            {info.value}
          </div>
        ) : (
          <div className="flex items-start gap-2 p-2 bg-rose-500/10 border border-rose-500/20 rounded text-rose-300 text-xs">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
            <span className="leading-tight">{info.error || 'Variable could not be resolved'}</span>
          </div>
        )}
      </div>

      {/* Scope Footer */}
      <div className="flex items-center justify-between text-[11px] text-[#888888] pt-2 mt-2 border-t border-[#333333]">
        <div className="flex items-center gap-1.5 truncate">
          {getSourceIcon()}
          <span className="truncate">
            Scope: <strong className="text-[#cccccc] font-medium">{info.sourceName}</strong>
          </span>
        </div>
        {onOpenEnvModal && (
          <button
            type="button"
            onClick={onOpenEnvModal}
            className="flex items-center gap-1 text-[10px] text-orange-400 hover:text-orange-300 transition-colors ml-2 shrink-0 cursor-pointer"
          >
            <span>Manage</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  );
};
