import React, { useState } from 'react';
import { Collection, HttpRequest } from '../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectSeparator,
} from './ui/select';
import { Folder, FolderPlus, Bookmark, Check } from 'lucide-react';

interface SaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: HttpRequest;
  collections: Collection[];
  onSave: (options: {
    name: string;
    collectionId: string;
    folderId?: string;
    newCollectionName?: string;
  }) => void;
}

export const SaveRequestModal: React.FC<SaveRequestModalProps> = ({
  isOpen,
  onClose,
  request,
  collections,
  onSave,
}) => {
  const [name, setName] = useState(
    request.name && request.name !== 'New Request'
      ? request.name
      : `${request.method} ${request.url ? request.url.replace(/^https?:\/\//, '').split('?')[0].slice(-24) : 'Request'}`
  );
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>(
    collections.length > 0 ? collections[0].id : 'new'
  );
  const [selectedFolderId, setSelectedFolderId] = useState<string>('root');
  const [newCollectionName, setNewCollectionName] = useState('My Collection');

  const currentCollection = collections.find((c) => c.id === selectedCollectionId);
  const availableFolders = currentCollection
    ? currentCollection.items.filter((i) => i.type === 'folder')
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (selectedCollectionId === 'new') {
      if (!newCollectionName.trim()) return;
      onSave({
        name: name.trim(),
        collectionId: 'new',
        newCollectionName: newCollectionName.trim(),
      });
    } else {
      onSave({
        name: name.trim(),
        collectionId: selectedCollectionId,
        folderId: selectedFolderId === 'root' ? undefined : selectedFolderId,
      });
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-primary" />
            <span>Save Request</span>
          </DialogTitle>
          <DialogDescription>
            Save this request into a collection and folder for reusability.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Request Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Request Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Get User Profile"
              autoFocus
              required
            />
          </div>

          {/* Collection Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Save to Collection</label>
            <Select
              value={selectedCollectionId}
              onValueChange={(val) => {
                setSelectedCollectionId(val);
                setSelectedFolderId('root');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a collection" />
              </SelectTrigger>
              <SelectContent>
                {collections.map((col) => (
                  <SelectItem key={col.id} value={col.id}>
                    <div className="flex items-center gap-2">
                      <Folder className="w-3.5 h-3.5 text-primary" />
                      <span>{col.name}</span>
                    </div>
                  </SelectItem>
                ))}
                {collections.length > 0 && <SelectSeparator />}
                <SelectItem value="new">
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>+ Create New Collection</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* New Collection Name Field if 'new' is selected */}
          {selectedCollectionId === 'new' && (
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-medium text-foreground">New Collection Name</label>
              <Input
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="e.g., Auth APIs"
                required
              />
            </div>
          )}

          {/* Folder Select (if existing collection selected) */}
          {selectedCollectionId !== 'new' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Folder (Optional)</label>
              <Select
                value={selectedFolderId}
                onValueChange={setSelectedFolderId}
                disabled={availableFolders.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Root of collection" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">
                    <span className="text-muted-foreground">/ (Root level)</span>
                  </SelectItem>
                  {availableFolders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="amber" size="sm">
              <Check className="w-3.5 h-3.5 mr-1" />
              <span>Save Request</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
