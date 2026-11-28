import React, { useState } from 'react';
import { CollectionRunItemResult } from '../../types';
import { Badge } from '../ui/badge';
import { CheckCircle2, XCircle, Clock, ChevronRight, ChevronDown } from 'lucide-react';

interface CollectionRunResultRowProps {
  item: CollectionRunItemResult;
}

export const CollectionRunResultRow: React.FC<CollectionRunResultRowProps> = ({ item }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40';
    if (status >= 300 && status < 400) return 'text-amber-400 bg-amber-950/40 border-amber-800/40';
    if (status >= 400 && status < 500) return 'text-orange-400 bg-orange-950/40 border-orange-800/40';
    return 'text-rose-400 bg-rose-950/40 border-rose-800/40';
  };

  const getMethodBadgeVariant = (m: string) => {
    switch (m.toUpperCase()) {
      case 'GET': return 'get';
      case 'POST': return 'post';
      case 'PUT': return 'put';
      case 'PATCH': return 'patch';
      case 'DELETE': return 'delete';
      default: return 'secondary';
    }
  };

  return (
    <div className="rounded-md border border-border bg-[#1a1b1e] text-xs overflow-hidden">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-[#202226] select-none"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
          {item.testResults.length > 0 ? (
            isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            )
          ) : (
            <div className="w-3.5" />
          )}

          {item.passed ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}

          <Badge
            variant={getMethodBadgeVariant(item.request.method) as any}
            className="px-1.5 py-0 text-[9px] font-bold shrink-0"
          >
            {item.request.method}
          </Badge>

          <span className="font-medium text-foreground truncate">{item.name}</span>
        </div>

        <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(item.statusCode)}`}>
            {item.statusCode || 'ERR'}
          </span>

          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{Math.round(item.timeMs)}ms</span>
          </div>

          {item.testResults.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {item.testResults.filter((t) => t.passed).length}/{item.testResults.length} passed
            </span>
          )}
        </div>
      </div>

      {isExpanded && item.testResults.length > 0 && (
        <div className="p-3 border-t border-border bg-[#141517] space-y-1.5">
          {item.testResults.map((t, idx) => (
            <div key={idx} className="flex items-start gap-2 text-[11px]">
              {t.passed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <span className={t.passed ? 'text-foreground' : 'text-rose-300 font-medium'}>
                  {t.name}
                </span>
                {t.error && (
                  <p className="text-[10px] text-rose-400 font-mono mt-0.5">{t.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
