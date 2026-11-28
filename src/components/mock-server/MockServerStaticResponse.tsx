import React from 'react';
import { MockRoute } from '../../types/server';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

interface MockServerStaticResponseProps {
  currentRoute: MockRoute;
  onUpdateRoute: (updates: Partial<MockRoute>) => void;
}

const COMMON_STATUS_CODES = [200, 201, 204, 400, 401, 403, 404, 500];

export const MockServerStaticResponse: React.FC<MockServerStaticResponseProps> = ({
  currentRoute,
  onUpdateRoute,
}) => {
  const statusCode = currentRoute.staticResponse.statusCode;

  const handleStatusCodeChange = (code: number) => {
    onUpdateRoute({
      staticResponse: {
        ...currentRoute.staticResponse,
        statusCode: code,
      },
    });
  };

  const handleBodyChange = (body: string) => {
    onUpdateRoute({
      staticResponse: {
        ...currentRoute.staticResponse,
        body,
      },
    });
  };

  return (
    <div className="flex-1 flex flex-col space-y-3">
      {/* Status Code Row */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-muted-foreground font-medium shrink-0">
          Status Code:
        </label>
        <div className="flex items-center gap-1.5 flex-wrap">
          {COMMON_STATUS_CODES.map((code) => {
            const isSelected = statusCode === code;
            return (
              <Button
                key={code}
                variant={isSelected ? 'amber' : 'outline'}
                size="sm"
                onClick={() => handleStatusCodeChange(code)}
                className="font-mono text-xs px-2 h-7"
              >
                {code}
              </Button>
            );
          })}
          <div className="w-16 ml-1">
            <Input
              type="number"
              value={statusCode}
              onChange={(e) => handleStatusCodeChange(Number(e.target.value))}
              className="h-7 text-xs text-center font-mono"
            />
          </div>
        </div>
      </div>

      {/* Response Body Editor */}
      <div className="flex-1 flex flex-col min-h-[220px]">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span className="font-medium">Response Body (JSON / Text):</span>
          <span className="text-[11px] text-muted-foreground/80 font-mono">
            Interpolates: <code className="text-primary">{`{{params.id}}`}</code>, <code className="text-primary">{`{{query.q}}`}</code>, <code className="text-primary">{`{{$uuid}}`}</code>
          </span>
        </div>
        <Textarea
          value={currentRoute.staticResponse.body}
          onChange={(e) => handleBodyChange(e.target.value)}
          spellCheck={false}
          placeholder='{\n  "status": "success",\n  "data": []\n}'
          className="flex-1 w-full p-3 font-mono text-xs leading-5 min-h-[240px]"
        />
      </div>
    </div>
  );
};
