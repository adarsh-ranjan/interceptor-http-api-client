import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface ResponseHeadersTabProps {
  headers: Record<string, any>;
}

export const ResponseHeadersTab: React.FC<ResponseHeadersTabProps> = ({ headers }) => {
  const [filter, setFilter] = useState('');
  const headerKeys = Object.keys(headers || {});
  const filteredHeaderKeys = headerKeys.filter(
    (k) =>
      k.toLowerCase().includes(filter.toLowerCase()) ||
      String(headers[k]).toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-auto p-3">
      {headerKeys.length > 6 && (
        <div className="relative mb-2">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#666666]" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter headers..."
            className="w-full bg-[#222224] border border-[#333333] rounded pl-8 pr-2.5 py-1 text-xs text-[#cccccc] placeholder:text-[#666666] outline-none focus:border-[#d99b26]"
          />
        </div>
      )}
      <div className="border border-[#333333] rounded overflow-hidden">
        <table className="w-full text-left font-mono text-[11px]">
          <thead className="bg-[#222224] text-[#888888] border-b border-[#333333]">
            <tr>
              <th className="py-1.5 px-3 font-semibold w-1/3">Header</th>
              <th className="py-1.5 px-3 font-semibold">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#333333] bg-[#1a1a1a]">
            {filteredHeaderKeys.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-4 text-center text-[#666666]">
                  No matching headers
                </td>
              </tr>
            ) : (
              filteredHeaderKeys.map((key) => (
                <tr key={key} className="hover:bg-[#222224] transition-colors">
                  <td className="py-1.5 px-3 text-[#cccccc] font-medium select-text break-all">
                    {key}
                  </td>
                  <td className="py-1.5 px-3 text-[#999999] select-text break-all">
                    {headers[key]}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
