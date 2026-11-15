import React, { useState } from 'react';
import { Collection, HttpRequest } from '../types';
import { Folder, FolderPlus, Bookmark, X, Check } from 'lucide-react';

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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d] bg-[#0d1117]">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <Bookmark className="w-4 h-4 text-sky-400" />
            <span>Save Request</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-[#21262d] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Request Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Get User Profile"
              required
              autoFocus
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Target Collection</label>
            <select
              value={selectedCollectionId}
              onChange={(e) => {
                setSelectedCollectionId(e.target.value);
                setSelectedFolderId('root');
              }}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-slate-100 focus:outline-none focus:border-sky-500"
            >
              {collections.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name} ({col.items.length} items)
                </option>
              ))}
              <option value="new">+ Create New Collection</option>
            </select>
          </div>

          {selectedCollectionId === 'new' && (
            <div>
              <label className="block text-slate-400 font-medium mb-1">New Collection Name</label>
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="e.g. Payment Gateway APIs"
                required
                className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>
          )}

          {selectedCollectionId !== 'new' && availableFolders.length > 0 && (
            <div>
              <label className="block text-slate-400 font-medium mb-1">Folder (Optional)</label>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-slate-100 focus:outline-none focus:border-sky-500"
              >
                <option value="root">Root Collection</option>
                {availableFolders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    📁 {folder.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#30363d]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#21262d] rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium shadow-sm transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
