import React from 'react';
import { Collection, CollectionItem } from '../../types';
import { Copy, Download, Edit2, FileCode, FolderPlus, Play, Plus, Trash2 } from 'lucide-react';
import { PortalMenu } from '../PortalMenu';

export interface ActiveMenuState {
  id: string;
  type: 'collection' | 'folder' | 'request';
  collectionId: string;
  itemId?: string;
  name: string;
  item?: CollectionItem;
  collection?: Collection;
  anchorRect: DOMRect;
}

interface CollectionContextMenuProps {
  activeMenu: ActiveMenuState | null;
  onClose: () => void;
  onAddRequest: (collectionId: string, folderId?: string) => void;
  onAddFolder: (collectionId: string, parentFolderId?: string) => void;
  onRunCollection: (collection: Collection) => void;
  onStartRename: (id: string, name: string) => void;
  onExport: (collection: Collection, format: 'postman' | 'interceptor') => void;
  onDuplicateItem: (collectionId: string, itemId: string) => void;
  onRequestDeleteCollection: (collection: Collection) => void;
  onRequestDeleteItem: (target: {
    collectionId: string;
    itemId: string;
    itemName: string;
    isFolder: boolean;
  }) => void;
}

export const CollectionContextMenu: React.FC<CollectionContextMenuProps> = ({
  activeMenu,
  onClose,
  onAddRequest,
  onAddFolder,
  onRunCollection,
  onStartRename,
  onExport,
  onDuplicateItem,
  onRequestDeleteCollection,
  onRequestDeleteItem,
}) => {
  if (!activeMenu) return null;

  const menuWidth = 196;
  let left = activeMenu.anchorRect.right - menuWidth;
  if (left < 10) left = 10;
  if (left + menuWidth > window.innerWidth - 10) {
    left = window.innerWidth - menuWidth - 10;
  }

  const estimatedHeight =
    activeMenu.type === 'collection' ? 245 : activeMenu.type === 'folder' ? 145 : 105;

  let top = activeMenu.anchorRect.bottom + 4;
  if (top + estimatedHeight > window.innerHeight - 8) {
    top = Math.max(8, activeMenu.anchorRect.top - estimatedHeight - 4);
  }

  return (
    <PortalMenu
      isOpen={Boolean(activeMenu)}
      position={{ top, left }}
      onClose={onClose}
      ignoreTargetSelector={`[data-menu-id="${activeMenu.id}"]`}
      className="w-48 bg-[#222224] border border-[#333333] rounded-md shadow-2xl py-1 text-xs select-none backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 text-[#cccccc]"
    >
      {activeMenu.type === 'collection' && activeMenu.collection && (
        <>
          <button
            onClick={() => {
              onAddRequest(activeMenu.collectionId);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[#d99b26]" />
            <span>Add Request</span>
          </button>
          <button
            onClick={() => onAddFolder(activeMenu.collectionId)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[#d99b26]" />
            <span>Add Folder</span>
          </button>
          <button
            onClick={() => {
              onRunCollection(activeMenu.collection!);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-emerald-400 hover:bg-[#26292b] text-left transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run Collection</span>
          </button>

          <div className="border-t border-[#333333] my-1" />

          <button
            onClick={() => onStartRename(activeMenu.collectionId, activeMenu.name)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5 text-[#888888]" />
            <span>Rename</span>
          </button>
          <button
            onClick={() => onExport(activeMenu.collection!, 'postman')}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#888888]" />
            <span>Export (Postman v2.1)</span>
          </button>
          <button
            onClick={() => onExport(activeMenu.collection!, 'interceptor')}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors"
          >
            <FileCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export (Interceptor)</span>
          </button>

          <div className="border-t border-[#333333] my-1" />

          <button
            onClick={() => {
              onRequestDeleteCollection(activeMenu.collection!);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 text-left font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Collection</span>
          </button>
        </>
      )}

      {activeMenu.type === 'folder' && (
        <>
          <button
            onClick={() => {
              onAddRequest(activeMenu.collectionId, activeMenu.itemId);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#d99b26]" />
            <span>Add Request</span>
          </button>
          <button
            onClick={() => onAddFolder(activeMenu.collectionId, activeMenu.itemId)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[#d99b26]" />
            <span>Add Subfolder</span>
          </button>

          <div className="border-t border-[#333333] my-1" />

          <button
            onClick={() => onStartRename(activeMenu.itemId!, activeMenu.name)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-[#888888]" />
            <span>Rename</span>
          </button>

          <div className="border-t border-[#333333] my-1" />

          <button
            onClick={() => {
              onRequestDeleteItem({
                collectionId: activeMenu.collectionId,
                itemId: activeMenu.itemId!,
                itemName: activeMenu.name,
                isFolder: true,
              });
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 text-left font-medium transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Folder</span>
          </button>
        </>
      )}

      {activeMenu.type === 'request' && (
        <>
          <button
            onClick={() => onDuplicateItem(activeMenu.collectionId, activeMenu.itemId!)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-white" />
            <span>Duplicate</span>
          </button>
          <button
            onClick={() => onStartRename(activeMenu.itemId!, activeMenu.name)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-[#888888]" />
            <span>Rename</span>
          </button>

          <div className="border-t border-[#333333] my-1" />

          <button
            onClick={() => {
              onRequestDeleteItem({
                collectionId: activeMenu.collectionId,
                itemId: activeMenu.itemId!,
                itemName: activeMenu.name,
                isFolder: false,
              });
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 text-left font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </>
      )}
    </PortalMenu>
  );
};
