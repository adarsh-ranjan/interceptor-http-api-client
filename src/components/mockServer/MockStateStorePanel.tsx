import React from 'react';
import { Code2, Database, RefreshCw, Trash2 } from 'lucide-react';

interface MockStateStorePanelProps {
  storeData: Record<string, any>;
  storeJsonInput: string;
  isEditingStore: boolean;
  storeFeedback: string | null;
  onStoreJsonInputChange: (val: string) => void;
  onRefreshStore: () => void;
  onToggleEditStore: () => void;
  onSaveStore: () => void;
  onClearStore: () => void;
}

export const MockStateStorePanel: React.FC<MockStateStorePanelProps> = ({
  storeData,
  storeJsonInput,
  isEditingStore,
  storeFeedback,
  onStoreJsonInputChange,
  onRefreshStore,
  onToggleEditStore,
  onSaveStore,
  onClearStore,
}) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 bg-[#222224] p-3 rounded border border-[#333333]">
        <div className="flex items-center gap-2.5">
          <Database className="w-4 h-4 text-[#d99b26]" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-white">In-Memory State Store</span>
            <span className="text-[11px] text-[#777777]">
              Shared key-value state persisted across requests during server runtime via{' '}
              <code className="text-[#98c379]">store</code>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {storeFeedback && (
            <span className="text-xs text-emerald-400 font-medium animate-in fade-in duration-100">
              {storeFeedback}
            </span>
          )}
          <button
            type="button"
            onClick={onRefreshStore}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-[#1a1a1a] hover:bg-[#26292b] border border-[#333333] text-[#cccccc] hover:text-white rounded transition-colors cursor-pointer"
            title="Refresh store contents from server"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={onToggleEditStore}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs border rounded transition-colors cursor-pointer ${
              isEditingStore
                ? 'bg-[#d99b26] text-black border-[#d99b26] font-semibold'
                : 'bg-[#1a1a1a] hover:bg-[#26292b] border-[#333333] text-[#cccccc] hover:text-white'
            }`}
          >
            <Code2 className="w-3 h-3" />
            <span>{isEditingStore ? 'Cancel Edit' : 'Seed / Edit JSON'}</span>
          </button>
          <button
            type="button"
            onClick={onClearStore}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-[#1a1a1a] hover:bg-rose-500/10 border border-[#333333] hover:border-rose-500/30 text-[#888888] hover:text-rose-400 rounded transition-colors cursor-pointer"
            title="Clear in-memory store"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear Store</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-[#141517] border border-[#333333] rounded p-3">
        {isEditingStore ? (
          <div className="flex-1 flex flex-col space-y-2">
            <div className="flex items-center justify-between text-xs text-[#888888]">
              <span>Edit store JSON below and click Apply:</span>
              <button
                type="button"
                onClick={onSaveStore}
                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded text-xs transition-colors cursor-pointer"
              >
                Apply Store Data
              </button>
            </div>
            <textarea
              value={storeJsonInput}
              onChange={(e) => onStoreJsonInputChange(e.target.value)}
              className="flex-1 w-full p-3 font-mono text-xs leading-5 bg-[#1a1a1a] border border-[#333333] rounded text-[#cccccc] focus:outline-none focus:border-[#d99b26] resize-none"
            />
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            {Object.keys(storeData).length > 0 ? (
              <pre className="font-mono text-xs text-emerald-300 leading-relaxed">
                {JSON.stringify(storeData, null, 2)}
              </pre>
            ) : (
              <div className="text-center py-16 text-xs text-[#666666] space-y-2">
                <Database className="w-8 h-8 text-[#444444] mx-auto" />
                <div>In-memory store is currently empty.</div>
                <div className="text-[11px] text-[#555555]">
                  Use <code className="text-[#98c379]">store.items = [...]</code> in a dynamic
                  script or click <strong>Seed / Edit JSON</strong> to initialize data.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
