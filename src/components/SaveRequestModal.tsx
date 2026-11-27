import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Collection, HttpRequest } from '../types';
import { Folder, FolderPlus, Save, X, Check, ChevronDown } from 'lucide-react';

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

  // Custom Dropdown Menus State & Position
  const [isCollectionMenuOpen, setIsCollectionMenuOpen] = useState(false);
  const [collectionMenuPos, setCollectionMenuPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const collectionButtonRef = useRef<HTMLButtonElement>(null);
  const collectionDropdownRef = useRef<HTMLDivElement>(null);

  const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false);
  const [folderMenuPos, setFolderMenuPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const folderButtonRef = useRef<HTMLButtonElement>(null);
  const folderDropdownRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click, Escape, or scroll
  useEffect(() => {
    if (!isCollectionMenuOpen && !isFolderMenuOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (collectionDropdownRef.current && collectionDropdownRef.current.contains(target)) return;
      if (collectionButtonRef.current && collectionButtonRef.current.contains(target)) return;
      if (folderDropdownRef.current && folderDropdownRef.current.contains(target)) return;
      if (folderButtonRef.current && folderButtonRef.current.contains(target)) return;

      setIsCollectionMenuOpen(false);
      setIsFolderMenuOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCollectionMenuOpen(false);
        setIsFolderMenuOpen(false);
      }
    };

    const handleScroll = (e: Event) => {
      if (collectionDropdownRef.current && collectionDropdownRef.current.contains(e.target as Node)) return;
      if (folderDropdownRef.current && folderDropdownRef.current.contains(e.target as Node)) return;
      setIsCollectionMenuOpen(false);
      setIsFolderMenuOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isCollectionMenuOpen, isFolderMenuOpen]);

  if (!isOpen) return null;

  const currentCollection = collections.find((c) => c.id === selectedCollectionId);
  const availableFolders = currentCollection
    ? currentCollection.items.filter((i) => i.type === 'folder')
    : [];

  const toggleCollectionMenu = () => {
    if (isCollectionMenuOpen) {
      setIsCollectionMenuOpen(false);
      return;
    }
    if (collectionButtonRef.current) {
      const rect = collectionButtonRef.current.getBoundingClientRect();
      setCollectionMenuPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
      setIsFolderMenuOpen(false);
      setIsCollectionMenuOpen(true);
    }
  };

  const toggleFolderMenu = () => {
    if (isFolderMenuOpen) {
      setIsFolderMenuOpen(false);
      return;
    }
    if (folderButtonRef.current) {
      const rect = folderButtonRef.current.getBoundingClientRect();
      setFolderMenuPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
      setIsCollectionMenuOpen(false);
      setIsFolderMenuOpen(true);
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-md bg-[#222224] border border-[#333333] rounded-lg shadow-2xl overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#333333] bg-[#1a1a1a]">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Save className="w-4 h-4 text-[#d99b26]" />
            <span>Save Request</span>
          </div>
          <button
            onClick={onClose}
            className="text-[#888888] hover:text-white p-1 rounded hover:bg-[#26292b] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-[#888888] font-medium mb-1">Request Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Get User Profile"
              required
              autoFocus
              className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3 py-2 text-[#cccccc] focus:outline-none focus:border-[#444444] font-sans"
            />
          </div>

          {/* Custom Target Collection Dropdown (Bruno-style like HTTP method menu) */}
          <div>
            <label className="block text-[#888888] font-medium mb-1">Target Collection</label>
            <div className="relative">
              <button
                ref={collectionButtonRef}
                type="button"
                onClick={toggleCollectionMenu}
                className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3 py-2 text-[#cccccc] flex items-center justify-between cursor-pointer focus:outline-none focus:border-[#444444] hover:border-[#555555] transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  {selectedCollectionId === 'new' ? (
                    <>
                      <FolderPlus className="w-3.5 h-3.5 text-[#d99b26] shrink-0" />
                      <span className="truncate text-[#d99b26] font-medium">+ Create New Collection</span>
                    </>
                  ) : (
                    <>
                      <Folder className="w-3.5 h-3.5 text-[#d99b26] shrink-0" />
                      <span className="truncate">{currentCollection?.name || 'Select Collection'}</span>
                      {currentCollection && (
                        <span className="text-[10px] text-[#777777] font-mono">
                          ({currentCollection.items.length} {currentCollection.items.length === 1 ? 'item' : 'items'})
                        </span>
                      )}
                    </>
                  )}
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#777777] transition-transform ${
                    isCollectionMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>
          </div>

          {selectedCollectionId === 'new' && (
            <div>
              <label className="block text-[#888888] font-medium mb-1">New Collection Name</label>
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="e.g. Payment Gateway APIs"
                required
                className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3 py-2 text-[#cccccc] focus:outline-none focus:border-[#444444] font-sans"
              />
            </div>
          )}

          {/* Custom Folder Dropdown if available */}
          {selectedCollectionId !== 'new' && availableFolders.length > 0 && (
            <div>
              <label className="block text-[#888888] font-medium mb-1">Folder (Optional)</label>
              <div className="relative">
                <button
                  ref={folderButtonRef}
                  type="button"
                  onClick={toggleFolderMenu}
                  className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-3 py-2 text-[#cccccc] flex items-center justify-between cursor-pointer focus:outline-none focus:border-[#444444] hover:border-[#555555] transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Folder className="w-3.5 h-3.5 text-[#888888] shrink-0" />
                    <span className="truncate">
                      {selectedFolderId === 'root'
                        ? 'Root Collection'
                        : availableFolders.find((f) => f.id === selectedFolderId)?.name || 'Root Collection'}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[#777777] transition-transform ${
                      isFolderMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#333333]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-[#888888] hover:text-[#cccccc] hover:bg-[#26292b] rounded transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#d99b26] hover:bg-[#c48b20] text-white rounded font-medium shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          </div>
        </form>
      </div>

      {/* Floating Bruno-style Collection Selection Menu */}
      {isCollectionMenuOpen && collectionMenuPos && createPortal(
        <div
          ref={collectionDropdownRef}
          style={{
            position: 'fixed',
            top: `${collectionMenuPos.top}px`,
            left: `${collectionMenuPos.left}px`,
            width: `${collectionMenuPos.width}px`,
            zIndex: 9999,
          }}
          className="bg-[#222224] border border-[#333333] rounded-md shadow-2xl py-1 text-xs select-none backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto no-scrollbar"
          onClick={(e) => e.stopPropagation()}
        >
          {collections.map((col) => {
            const isSelected = selectedCollectionId === col.id;
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => {
                  setSelectedCollectionId(col.id);
                  setSelectedFolderId('root');
                  setIsCollectionMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 font-mono text-xs text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'text-white bg-[#26292b] font-semibold'
                    : 'text-[#cccccc] hover:text-white hover:bg-[#26292b]'
                }`}
              >
                <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                  <Folder className="w-3.5 h-3.5 text-[#d99b26] shrink-0" />
                  <span className="truncate">{col.name}</span>
                  <span className="text-[10px] text-[#777777] font-mono">
                    ({col.items.length})
                  </span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#d99b26] shrink-0 ml-2" />}
              </button>
            );
          })}

          <div className="my-1 border-t border-[#333333]" />

          <button
            type="button"
            onClick={() => {
              setSelectedCollectionId('new');
              setSelectedFolderId('root');
              setIsCollectionMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 font-mono text-xs text-left transition-colors cursor-pointer ${
              selectedCollectionId === 'new'
                ? 'text-white bg-[#1f2433] font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-[#1f2433]'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <FolderPlus className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span>+ Create New Collection</span>
            </div>
            {selectedCollectionId === 'new' && (
              <Check className="w-3.5 h-3.5 text-orange-400 shrink-0 ml-2" />
            )}
          </button>
        </div>,
        document.body
      )}

      {/* Floating Bruno-style Folder Selection Menu */}
      {isFolderMenuOpen && folderMenuPos && createPortal(
        <div
          ref={folderDropdownRef}
          style={{
            position: 'fixed',
            top: `${folderMenuPos.top}px`,
            left: `${folderMenuPos.left}px`,
            width: `${folderMenuPos.width}px`,
            zIndex: 9999,
          }}
          className="bg-[#222224] border border-[#333333] rounded-md shadow-2xl py-1 text-xs select-none backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto no-scrollbar text-[#cccccc]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              setSelectedFolderId('root');
              setIsFolderMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 font-mono text-xs text-left transition-colors cursor-pointer ${
              selectedFolderId === 'root'
                ? 'text-white bg-[#1f2433] font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-[#1f2433]'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <Folder className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Root Collection</span>
            </div>
            {selectedFolderId === 'root' && (
              <Check className="w-3.5 h-3.5 text-orange-400 shrink-0 ml-2" />
            )}
          </button>

          {availableFolders.map((folder) => {
            const isSelected = selectedFolderId === folder.id;
            return (
              <button
                key={folder.id}
                type="button"
                onClick={() => {
                  setSelectedFolderId(folder.id);
                  setIsFolderMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 font-mono text-xs text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'text-white bg-[#1f2433] font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-[#1f2433]'
                }`}
              >
                <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                  <Folder className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span className="truncate">{folder.name}</span>
                </div>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-orange-400 shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
};
