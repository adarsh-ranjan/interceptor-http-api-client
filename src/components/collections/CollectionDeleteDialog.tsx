import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteTarget {
  id: string;
  name: string;
  type: 'collection' | 'folder' | 'request';
  collectionId?: string;
  count?: number;
}

interface CollectionDeleteDialogProps {
  target: DeleteTarget | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const CollectionDeleteDialog: React.FC<CollectionDeleteDialogProps> = ({
  target,
  onClose,
  onConfirm,
}) => {
  if (!target) return null;

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>Delete {target.type === 'collection' ? 'Collection' : target.type === 'folder' ? 'Folder' : 'Request'}</span>
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong className="text-foreground">"{target.name}"</strong>?
            {target.type === 'collection' && target.count !== undefined && target.count > 0 && (
              <span className="block mt-1 text-rose-400">
                This will permanently delete all {target.count} requests and folders inside this collection.
              </span>
            )}
            {target.type === 'folder' && (
              <span className="block mt-1 text-rose-400">
                This will permanently delete this folder and all nested requests inside it.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            <span>Delete Permanently</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
