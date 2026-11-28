import React from 'react';
import { MockRoute } from '../../types/server';
import { DYNAMIC_MOCK_SNIPPETS } from '../../constants/snippets';
import { Code2, FileText, Info, Sparkles } from 'lucide-react';
import { DynamicScriptEditor } from '../DynamicScriptEditor';
import { HttpMethodDropdown } from '../HttpMethodDropdown';

interface MockRouteEditorProps {
  route: MockRoute;
  onUpdateRoute: (updated: Partial<MockRoute>) => void;
  onPrettifyBody: () => void;
}

export const MockRouteEditor: React.FC<MockRouteEditorProps> = ({
  route,
  onUpdateRoute,
  onPrettifyBody,
}) => {
  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-4">
      <div className="flex items-center gap-3 bg-[#222224] p-3 rounded border border-[#333333]">
        <HttpMethodDropdown
          method={route.method}
          onChange={(m) => onUpdateRoute({ method: m as any })}
          includeAll
        />

        <div className="flex-1 flex items-center gap-1 bg-[#1a1a1a] border border-[#333333] rounded px-3 py-1 text-xs">
          <span className="text-[#666666] font-mono">/</span>
          <input
            type="text"
            value={route.path.replace(/^\//, '')}
            onChange={(e) =>
              onUpdateRoute({
                path: e.target.value.startsWith('/') ? e.target.value : `/${e.target.value}`,
              })
            }
            placeholder="users or users/:id"
            className="w-full bg-transparent font-mono text-white focus:outline-none"
          />
        </div>

        <input
          type="text"
          value={route.name}
          onChange={(e) => onUpdateRoute({ name: e.target.value })}
          placeholder="Route Label (e.g. Get All Users)"
          className="w-48 bg-[#1a1a1a] border border-[#333333] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#d99b26]"
        />

        <div className="flex items-center gap-1 bg-[#1a1a1a] border border-[#333333] rounded px-2 py-1 text-xs text-[#888888]">
          <span>Delay:</span>
          <input
            type="number"
            value={route.delayMs}
            onChange={(e) =>
              onUpdateRoute({ delayMs: Math.max(0, parseInt(e.target.value) || 0) })
            }
            className="w-14 bg-transparent text-white font-mono text-center focus:outline-none"
          />
          <span>ms</span>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-[#333333] pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#888888] font-medium">Response Engine:</span>
          <div className="flex items-center bg-[#222224] p-0.5 rounded border border-[#333333]">
            <button
              type="button"
              onClick={() => onUpdateRoute({ responseMode: 'static' })}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                route.responseMode === 'static'
                  ? 'bg-[#d99b26] text-black font-semibold'
                  : 'text-[#888888] hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Static Response</span>
            </button>
            <button
              type="button"
              onClick={() => onUpdateRoute({ responseMode: 'dynamic' })}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                route.responseMode === 'dynamic'
                  ? 'bg-[#d99b26] text-black font-semibold'
                  : 'text-[#888888] hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Dynamic Code (Express-style)</span>
            </button>
          </div>
        </div>

        {route.responseMode === 'static' && (
          <button
            type="button"
            onClick={onPrettifyBody}
            className="text-xs text-[#d99b26] hover:text-[#e5a730] transition-colors"
          >
            Prettify JSON
          </button>
        )}
      </div>

      {route.responseMode === 'static' ? (
        <div className="flex-1 flex flex-col space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#888888] font-medium">HTTP Status Code:</span>
            <input
              type="number"
              value={route.staticResponse.statusCode}
              onChange={(e) =>
                onUpdateRoute({
                  staticResponse: {
                    ...route.staticResponse,
                    statusCode: parseInt(e.target.value) || 200,
                  },
                })
              }
              className="w-18 bg-[#222224] border border-[#333333] rounded px-2 py-1 text-xs text-center font-mono font-bold text-white focus:outline-none focus:border-[#d99b26]"
            />
            <div className="flex items-center gap-1 ml-2">
              {[200, 201, 400, 404, 500].map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() =>
                    onUpdateRoute({
                      staticResponse: {
                        ...route.staticResponse,
                        statusCode: code,
                      },
                    })
                  }
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                    route.staticResponse.statusCode === code
                      ? 'bg-[#d99b26]/20 border-[#d99b26] text-[#d99b26]'
                      : 'bg-[#222224] border-[#333333] text-[#888888] hover:text-white'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-[220px]">
            <div className="flex items-center justify-between text-xs text-[#888888] mb-1">
              <span>Response Body (JSON / Text):</span>
              <span className="text-[11px] text-[#666666]">
                Tips: Use <code className="text-[#d99b26]">{'{{params.id}}'}</code> or{' '}
                <code className="text-[#d99b26]">{'{{query.search}}'}</code>
              </span>
            </div>
            <textarea
              value={route.staticResponse.body}
              onChange={(e) =>
                onUpdateRoute({
                  staticResponse: {
                    ...route.staticResponse,
                    body: e.target.value,
                  },
                })
              }
              spellCheck={false}
              className="flex-1 w-full p-3 font-mono text-xs leading-5 bg-[#141517] border border-[#333333] rounded text-[#cccccc] focus:outline-none focus:border-[#d99b26] resize-none"
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-[#888888] flex items-center gap-1 font-medium mr-1">
              <Sparkles className="w-3 h-3 text-[#d99b26]" />
              <span>Snippets:</span>
            </span>
            {DYNAMIC_MOCK_SNIPPETS.map((snippet) => (
              <button
                key={snippet.name}
                type="button"
                onClick={() => onUpdateRoute({ dynamicScript: snippet.code })}
                className="px-2 py-0.5 rounded bg-[#222224] hover:bg-[#26292b] border border-[#333333] hover:border-[#444444] text-[11px] text-[#cccccc] hover:text-[#d99b26] transition-colors cursor-pointer"
                title={snippet.desc}
              >
                {snippet.name}
              </button>
            ))}
          </div>

          <div className="flex-1 flex flex-col min-h-[300px]">
            <DynamicScriptEditor
              value={route.dynamicScript}
              onChange={(val) => onUpdateRoute({ dynamicScript: val })}
              minHeight="300px"
            />
          </div>

          <div className="bg-[#222224]/80 p-2.5 rounded border border-[#333333] text-[11px] text-[#888888] space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-white">
              <Info className="w-3.5 h-3.5 text-[#d99b26]" />
              <span>Available Runtime Globals</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10px]">
              <div>
                <span className="text-[#61afef]">req</span>: params, query, body, headers, method,
                path
              </div>
              <div>
                <span className="text-[#e5c07b]">res</span>: status(code), setHeader(k, v),
                json(obj), send(text)
              </div>
              <div>
                <span className="text-[#98c379]">store</span>: Shared in-memory KV state across
                requests
              </div>
              <div>
                <span className="text-[#c678dd]">utils</span>: uuid(), isoTimestamp(), timestamp(),
                randomInt(min, max), sleep(ms)
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
