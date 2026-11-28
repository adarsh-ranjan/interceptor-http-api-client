import React, { useState } from 'react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Database, RefreshCw, Trash2, Edit3, Check, AlertCircle } from 'lucide-react';

interface MockServerStateStoreProps {
  store: Record<string, any>;
  onRefreshStore: () => void;
  onClearStore: () => void;
  onSaveStore: (newStore: Record<string, any>) => void;
  serverRunning: boolean;
}

export const MockServerStateStore: React.FC<MockServerStateStoreProps> = ({
  store,
  onRefreshStore,
  onClearStore,
  onSaveStore,
  serverRunning,
}) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [rawJson, setRawJson] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const keyCount = Object.keys(store || {}).length;

  const handleOpenEdit = () => {
    setRawJson(JSON.stringify(store || {}, null, 2));
    setJsonError(null);
    setIsEditDialogOpen(true);
  };

  const handleSaveJson = () => {
    try {
      const parsed = JSON.parse(rawJson);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setJsonError('Store must be a valid JSON object (key-value dictionary).');
        return;
      }
      onSaveStore(parsed);
      setIsEditDialogOpen(false);
    } catch (err: any) {
      setJsonError(err.message || 'Invalid JSON syntax');
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-3">
      {/* Controls Bar */}
      <div className="flex items-center justify-between bg-[#1a1b1e] p-2.5 rounded-lg border border-border">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">In-Memory Store</span>
          <span className="text-[11px] text-muted-foreground font-mono">
            ({keyCount} active keys)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefreshStore}
            disabled={!serverRunning}
            className="h-7 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenEdit}
            disabled={!serverRunning}
            className="h-7 text-xs"
          >
            <Edit3 className="w-3.5 h-3.5 mr-1" />
            <span>Edit JSON</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearStore}
            disabled={!serverRunning || keyCount === 0}
            className="h-7 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            <span>Clear Store</span>
          </Button>
        </div>
      </div>

      {/* Store Viewer */}
      <ScrollArea className="flex-1 rounded-lg border border-border bg-[#141517] p-4">
        {keyCount === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground space-y-2 font-sans">
            <Database className="w-8 h-8 mx-auto text-muted-foreground/30" />
            <p className="font-medium text-foreground">In-Memory Store is currently empty</p>
            <p className="text-[11px] text-muted-foreground/80 max-w-md mx-auto">
              Dynamic JavaScript route handlers can store and retrieve data across requests using{' '}
              <code className="text-primary font-mono font-semibold">store.myKey = value</code>, or click
              "Edit JSON" above to seed initial state.
            </p>
          </div>
        ) : (
          <pre className="font-mono text-xs text-emerald-400 leading-relaxed overflow-x-auto">
            {JSON.stringify(store, null, 2)}
          </pre>
        )}
      </ScrollArea>

      {/* Edit / Seed JSON Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              <span>Seed & Edit In-Memory Store</span>
            </DialogTitle>
            <DialogDescription>
              Edit the live JSON state dictionary for this mock server.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-1">
            <Textarea
              value={rawJson}
              onChange={(e) => {
                setRawJson(e.target.value);
                setJsonError(null);
              }}
              spellCheck={false}
              className="font-mono text-xs min-h-[260px] leading-relaxed"
              placeholder='{\n  "users": [],\n  "counter": 0\n}'
            />
            {jsonError && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{jsonError}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="amber" size="sm" onClick={handleSaveJson}>
              <Check className="w-3.5 h-3.5 mr-1" />
              <span>Save & Seed Store</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
