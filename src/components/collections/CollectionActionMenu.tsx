import React from 'react';
import {
  Play,
  FileCode,
  FolderPlus,
  Edit2,
  Copy,
  Download,
  Trash2,
} from 'lucide-react';

interface ActiveMenuState {
  id: string;
  type: 'collection' | 'folder' | 'request';
  collectionId: string;
  itemId?: string;
  name: string;
  item?: any;
  collection?: any;
  anchorRect: DOMRect;
}

interface CollectionActionMenuProps {
  activeMenu: ActiveMenuState;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onRunCollection: (collection: any) => void;
  onNewRequest: (colId: string, folderId?: string) => void;
  onNewFolder: (colId: string, parentFolderId?: string) => void;
  onStartRename: (id: string, name: string) => void;
  onCloneItem: (colId: string, item: any) => void;
  onExportCollection: (col: any, format: 'postman' | 'interceptor') => void;
  onRequestDeleteCollection: (col: any) => void;
  onRequestDeleteItem: (colId: string, itemId: string, name: string, isFolder: boolean) => void;
}

export const CollectionActionMenu: React.FC<CollectionActionMenuProps> = ({
  activeMenu,
  menuRef,
  onRunCollection,
  onNewRequest,
  onNewFolder,
  onStartRename,
  onCloneItem,
  onExportCollection,
  onRequestDeleteCollection,
  onRequestDeleteItem,
}) => {
  const menuWidth = 192;
  const menuHeight =
    activeMenu.type === 'collection'
      ? 240
      : activeMenu.type === 'folder'
      ? 160
      : 120;

  let left = activeMenu.anchorRect.right + 4;
  let top = activeMenu.anchorRect.top;

  if (left + menuWidth > window.innerWidth - 8) {
    left = activeMenu.anchorRect.left - menuWidth - 4;
  }
  if (top + menuHeight > window.innerHeight - 8) {
    top = window.innerHeight - menuHeight - 8;
  }
  top = Math.max(8, top);
  left = Math.max(8, left);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        zIndex: 9999,
      }}
      className="w-48 bg-[#222224] border border-[#333333] rounded-md shadow-2xl py-1 text-xs select-none backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
    >
      {activeMenu.type === 'collection' && activeMenu.collection && (
        <>
          <button
            onClick={() => onRunCollection(activeMenu.collection)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
            <span>Run Collection</span>
          </button>
          <div className="my-1 border-t border-[#333333]" />
          <button
            onClick={() => onNewRequest(activeMenu.collectionId)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5 text-[#d99b26]" />
            <span>New Request</span>
          </button>
          <button
            onClick={() => onNewFolder(activeMenu.collectionId)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5 text-blue-400" />
            <span>New Folder</span>
          </button>
          <div className="my-1 border-t border-[#333333]" />
          <button
            onClick={() => onStartRename(activeMenu.collectionId, activeMenu.name)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-[#888888]" />
            <span>Rename</span>
          </button>
          <button
            onClick={() => onExportCollection(activeMenu.collection, 'postman')}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-orange-400" />
            <span>Export (Postman v2.1)</span>
          </button>
          <button
            onClick={() => onExportCollection(activeMenu.collection, 'interceptor')}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#d99b26]" />
            <span>Export (Interceptor)</span>
          </button>
          <div className="my-1 border-t border-[#333333]" />
          <button
            onClick={() => onRequestDeleteCollection(activeMenu.collection)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 text-left transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Collection</span>
          </button>
        </>
      )}

      {activeMenu.type === 'folder' && (
        <>
          <button
            onClick={() => onNewRequest(activeMenu.collectionId, activeMenu.itemId)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5 text-[#d99b26]" />
            <span>New Request Inside</span>
          </button>
          <button
            onClick={() => onNewFolder(activeMenu.collectionId, activeMenu.itemId)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5 text-blue-400" />
            <span>New Subfolder</span>
          </button>
          <div className="my-1 border-t border-[#333333]" />
          <button
            onClick={() => onStartRename(activeMenu.itemId!, activeMenu.name)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-[#888888]" />
            <span>Rename Folder</span>
          </button>
          <button
            onClick={() =>
              onRequestDeleteItem(
                activeMenu.collectionId,
                activeMenu.itemId!,
                activeMenu.name,
                true
              )
            }
            className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 text-left transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Folder</span>
          </button>
        </>
      )}

      {activeMenu.type === 'request' && activeMenu.item && (
        <>
          <button
            onClick={() => onCloneItem(activeMenu.collectionId, activeMenu.item)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-[#888888]" />
            <span>Clone Request</span>
          </button>
          <button
            onClick={() => onStartRename(activeMenu.itemId!, activeMenu.name)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-[#888888]" />
            <span>Rename</span>
          </button>
          <div className="my-1 border-t border-[#333333]" />
          <button
            onClick={() =>
              onRequestDeleteItem(
                activeMenu.collectionId,
                activeMenu.itemId!,
                activeMenu.name,
                false
              )
            }
            className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 text-left transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Request</span>
          </button>
        </>
      )}
    </div>
  );
};
