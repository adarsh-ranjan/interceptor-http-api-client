import React from 'react';
import { RefreshCw, RotateCcw, Check, Sparkles } from 'lucide-react';

interface MockServerStateStoreProps {
  storeData: Record<string, any>;
  storeJsonInput: string;
  onStoreJsonInputChange: (val: string) => void;
  isEditingStore: boolean;
  onSetIsEditingStore: (val: boolean) => void;
  onRefreshStore: () => void;
  onApplyStore: () => void;
  onClearStore: () => void;
  storeFeedback: string | null;
}

export const MockServerStateStore: React.FC<MockServerStateStoreProps> = ({
  storeData,
  storeJsonInput,
  onStoreJsonInputChange,
  isEditingStore,
  onSetIsEditingStore,
  onRefreshStore,
  onApplyStore,
  onClearStore,
  storeFeedback,
}) => {
  return (
    <div className="flex-1 flex flex-col bg-[#1a1a1a] overflow-hidden select-none">
      {/* Top action bar */}
      <div className="p-3 border-b border-[#333333] flex items-center justify-between gap-3 bg-[#1e1e20] shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs text-white">In-Memory Key/Value Store</span>
          <span className="text-[11px] text-[#777777]">
            (Accessible via <code className="text-amber-400 font-mono">store.get(key)</code> and{' '}
            <code className="text-amber-400 font-mono">store.set(key, val)</code> in dynamic scripts)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {storeFeedback && (
            <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>{storeFeedback}</span>
            </span>
          )}

          <button
            onClick={onRefreshStore}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#26292b] hover:bg-[#333336] text-[#aaaaaa] hover:text-white border border-[#333333] text-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>

          <button
            onClick={onClearStore}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#26292b] hover:bg-rose-500/20 text-[#aaaaaa] hover:text-rose-300 border border-[#333333] text-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear Store</span>
          </button>
        </div>
      </div>

      {/* Store Body */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="max-w-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#888888]">Live In-Memory State (JSON)</span>
            {!isEditingStore ? (
              <button
                onClick={() => onSetIsEditingStore(true)}
                className="text-xs text-[#3b82f6] hover:underline cursor-pointer"
              >
                Edit JSON Directly
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSetIsEditingStore(false)}
                  className="text-xs text-[#888888] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={onApplyStore}
                  className="px-2.5 py-0.5 rounded bg-[#d99b26] text-white text-xs font-medium hover:bg-[#c2871a] cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>

          {isEditingStore ? (
            <textarea
              value={storeJsonInput}
              onChange={(e) => onStoreJsonInputChange(e.target.value)}
              className="w-full h-80 p-3 bg-[#222224] border border-[#333333] rounded font-mono text-xs text-[#cccccc] outline-none focus:border-[#d99b26] resize-none"
            />
          ) : (
            <pre className="p-3 bg-[#222224] border border-[#333333] rounded font-mono text-xs text-[#cccccc] overflow-x-auto min-h-48 whitespace-pre-wrap">
              {JSON.stringify(storeData, null, 2)}
            </pre>
          )}

          <div className="p-3 rounded bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300 space-y-1">
            <div className="flex items-center gap-1 font-semibold text-amber-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Usage in Dynamic Handlers:</span>
            </div>
            <p className="font-mono text-[11px] text-[#cccccc]">
              store.set('users', [...(store.get('users') || []), req.body]);
            </p>
            <p className="font-mono text-[11px] text-[#cccccc]">
              const users = store.get('users') || [];
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
