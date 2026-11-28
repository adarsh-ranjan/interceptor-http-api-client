import React from 'react';
import { MockRoute } from '../../types/server';
import { Plus, Trash2, Sparkles } from 'lucide-react';

interface MockServerStaticResponseProps {
  route: MockRoute;
  onUpdateRoute: (updated: MockRoute) => void;
  newHeaderKey: string;
  onNewHeaderKeyChange: (k: string) => void;
  newHeaderVal: string;
  onNewHeaderValChange: (v: string) => void;
  onAddHeader: () => void;
  onRemoveHeader: (key: string) => void;
}

export const MockServerStaticResponse: React.FC<MockServerStaticResponseProps> = ({
  route,
  onUpdateRoute,
  newHeaderKey,
  onNewHeaderKeyChange,
  newHeaderVal,
  onNewHeaderValChange,
  onAddHeader,
  onRemoveHeader,
}) => {
  const headers = route.headers || {};
  const headerKeys = Object.keys(headers);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs select-none">
      {/* Status Code */}
      <div className="flex items-center gap-4">
        <div>
          <label className="block text-[#888888] mb-1 font-medium">Status Code</label>
          <input
            type="number"
            value={route.statusCode || 200}
            onChange={(e) =>
              onUpdateRoute({ ...route, statusCode: parseInt(e.target.value, 10) || 200 })
            }
            className="w-24 bg-[#222224] border border-[#333333] rounded px-2.5 py-1 text-xs text-white font-mono focus:border-[#d99b26] outline-none"
          />
        </div>

        <div>
          <label className="block text-[#888888] mb-1 font-medium">Content-Type</label>
          <input
            type="text"
            value={headers['Content-Type'] || 'application/json'}
            onChange={(e) =>
              onUpdateRoute({
                ...route,
                headers: { ...headers, 'Content-Type': e.target.value },
              })
            }
            className="w-56 bg-[#222224] border border-[#333333] rounded px-2.5 py-1 text-xs text-white font-mono focus:border-[#d99b26] outline-none"
          />
        </div>
      </div>

      {/* Response Headers Table */}
      <div>
        <label className="block text-[#888888] mb-1 font-medium">Response Headers</label>
        <div className="border border-[#333333] rounded bg-[#222224] overflow-hidden">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#1a1a1a] text-[#888888] border-b border-[#333333]">
              <tr>
                <th className="py-1 px-3 w-1/3">Key</th>
                <th className="py-1 px-3">Value</th>
                <th className="py-1 px-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#333333]">
              {headerKeys.map((key) => (
                <tr key={key} className="hover:bg-[#26292b]">
                  <td className="py-1 px-3 text-[#cccccc]">{key}</td>
                  <td className="py-1 px-3 text-[#999999]">{headers[key]}</td>
                  <td className="py-1 px-2 text-center">
                    <button
                      onClick={() => onRemoveHeader(key)}
                      className="text-[#666666] hover:text-rose-400 p-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {/* Add header row */}
              <tr className="bg-[#1e1e20]">
                <td className="py-1 px-2">
                  <input
                    type="text"
                    value={newHeaderKey}
                    onChange={(e) => onNewHeaderKeyChange(e.target.value)}
                    placeholder="Header-Name"
                    className="w-full bg-transparent px-1 text-xs text-white placeholder:text-[#666666] outline-none font-mono"
                  />
                </td>
                <td className="py-1 px-2">
                  <input
                    type="text"
                    value={newHeaderVal}
                    onChange={(e) => onNewHeaderValChange(e.target.value)}
                    placeholder="value"
                    className="w-full bg-transparent px-1 text-xs text-white placeholder:text-[#666666] outline-none font-mono"
                  />
                </td>
                <td className="py-1 px-2 text-center">
                  <button
                    onClick={onAddHeader}
                    className="p-1 rounded bg-[#d99b26] hover:bg-[#c2871a] text-white cursor-pointer"
                    title="Add Header"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Response Body Editor */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <label className="text-[#888888] font-medium">Response Body (JSON or Text)</label>
          <div className="flex items-center gap-1 text-[11px] text-amber-400">
            <Sparkles className="w-3 h-3" />
            <span>Interpolates $timestamp, $randomInt, $uuid, headers.*</span>
          </div>
        </div>
        <textarea
          value={route.responseBody || ''}
          onChange={(e) => onUpdateRoute({ ...route, responseBody: e.target.value })}
          placeholder='{\n  "message": "Hello from mock server!"\n}'
          rows={10}
          className="w-full h-64 p-3 bg-[#222224] border border-[#333333] rounded font-mono text-xs text-[#cccccc] placeholder:text-[#666666] outline-none focus:border-[#d99b26] resize-none leading-relaxed"
        />
      </div>
    </div>
  );
};
