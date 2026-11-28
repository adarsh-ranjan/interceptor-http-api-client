import React from 'react';
import { MockRoute } from '../../types/server';
import { HttpMethod } from '../../types';
import { HttpMethodDropdown } from '../HttpMethodDropdown';
import { DynamicScriptEditor } from '../DynamicScriptEditor';
import { MockServerStaticResponse } from './MockServerStaticResponse';
import { Trash2, Code2, FileText, Clock } from 'lucide-react';

interface MockServerRouteEditorProps {
  route: MockRoute;
  onUpdateRoute: (updated: MockRoute) => void;
  onDeleteRoute: (routeId: string) => void;
  newHeaderKey: string;
  onNewHeaderKeyChange: (k: string) => void;
  newHeaderVal: string;
  onNewHeaderValChange: (v: string) => void;
  onAddHeader: () => void;
  onRemoveHeader: (key: string) => void;
}

export const MockServerRouteEditor: React.FC<MockServerRouteEditorProps> = ({
  route,
  onUpdateRoute,
  onDeleteRoute,
  newHeaderKey,
  onNewHeaderKeyChange,
  newHeaderVal,
  onNewHeaderValChange,
  onAddHeader,
  onRemoveHeader,
}) => {
  return (
    <div className="flex-1 flex flex-col bg-[#1a1a1a] overflow-hidden">
      {/* Route Top Configuration Bar */}
      <div className="p-3 border-b border-[#333333] flex items-center justify-between gap-3 bg-[#1e1e20] shrink-0 select-none">
        <div className="flex items-center gap-2 flex-1">
          {/* Method Dropdown */}
          <HttpMethodDropdown
            method={route.method}
            onChange={(m) => onUpdateRoute({ ...route, method: m })}
          />

          {/* Path Input */}
          <div className="flex items-center flex-1 bg-[#26292b] border border-[#333333] rounded px-2.5 py-1">
            <span className="text-[#666666] font-mono text-xs">/</span>
            <input
              type="text"
              value={route.path.replace(/^\//, '')}
              onChange={(e) => {
                const val = e.target.value.trim();
                onUpdateRoute({ ...route, path: val.startsWith('/') ? val : `/${val}` });
              }}
              placeholder="api/users/:id"
              className="w-full bg-transparent text-xs text-white font-mono placeholder:text-[#666666] outline-none ml-0.5"
            />
          </div>

          {/* Simulated Latency */}
          <div className="flex items-center gap-1.5 bg-[#26292b] border border-[#333333] rounded px-2 py-1 text-xs text-[#aaaaaa]">
            <Clock className="w-3.5 h-3.5 text-[#777777]" />
            <input
              type="number"
              min={0}
              step={50}
              value={route.delayMs || 0}
              onChange={(e) =>
                onUpdateRoute({ ...route, delayMs: Math.max(0, parseInt(e.target.value, 10) || 0) })
              }
              className="w-14 bg-transparent text-white font-mono text-xs outline-none text-right"
            />
            <span className="text-[#666666]">ms</span>
          </div>
        </div>

        {/* Delete Route */}
        <button
          onClick={() => onDeleteRoute(route.id)}
          className="p-1.5 rounded hover:bg-rose-500/20 text-[#777777] hover:text-rose-400 transition-colors cursor-pointer"
          title="Delete Route"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Mode Switcher: Static Response vs Dynamic JS Handler */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#333333] bg-[#1a1a1a] select-none shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdateRoute({ ...route, responseMode: 'static' })}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
              route.responseMode === 'static'
                ? 'bg-[#26292b] text-white font-medium border border-[#d99b26]/40'
                : 'text-[#888888] hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Static Response</span>
          </button>

          <button
            onClick={() => onUpdateRoute({ ...route, responseMode: 'dynamic' })}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
              route.responseMode === 'dynamic'
                ? 'bg-purple-500/20 text-purple-300 font-medium border border-purple-500/40'
                : 'text-[#888888] hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Dynamic Script (JS)</span>
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {route.responseMode === 'dynamic' ? (
          <DynamicScriptEditor
            script={route.dynamicScript || ''}
            onChange={(script) => onUpdateRoute({ ...route, dynamicScript: script })}
            route={route}
          />
        ) : (
          <MockServerStaticResponse
            route={route}
            onUpdateRoute={onUpdateRoute}
            newHeaderKey={newHeaderKey}
            onNewHeaderKeyChange={onNewHeaderKeyChange}
            newHeaderVal={newHeaderVal}
            onNewHeaderValChange={onNewHeaderValChange}
            onAddHeader={onAddHeader}
            onRemoveHeader={onRemoveHeader}
          />
        )}
      </div>
    </div>
  );
};
