import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';

interface ResponseHeadersTabProps {
  headers: Record<string, any>;
}

export const ResponseHeadersTab: React.FC<ResponseHeadersTabProps> = ({ headers }) => {
  const [filter, setFilter] = useState('');
  const headerKeys = Object.keys(headers || {});
  const filteredKeys = headerKeys.filter(
    (k) =>
      k.toLowerCase().includes(filter.toLowerCase()) ||
      String(headers[k]).toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full p-3 gap-2">
      {headerKeys.length > 5 && (
        <div className="relative mb-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter headers..."
            className="h-7 text-xs pl-8 bg-background border-border"
          />
        </div>
      )}
      <ScrollArea className="flex-1 border border-border rounded-md">
        <table className="w-full text-left font-mono text-[11px]">
          <thead className="bg-muted text-muted-foreground border-b border-border sticky top-0">
            <tr>
              <th className="py-1.5 px-3 font-semibold w-1/3">Header</th>
              <th className="py-1.5 px-3 font-semibold">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {filteredKeys.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-4 text-center text-muted-foreground">
                  No matching headers
                </td>
              </tr>
            ) : (
              filteredKeys.map((key) => (
                <tr key={key} className="hover:bg-muted/50 transition-colors">
                  <td className="py-1.5 px-3 text-foreground font-medium select-text break-all">
                    {key}
                  </td>
                  <td className="py-1.5 px-3 text-muted-foreground select-text break-all">
                    {headers[key]}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  );
};
