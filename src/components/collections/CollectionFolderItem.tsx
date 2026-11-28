import React from 'react';
import { CollectionItem } from '../../types';
import { ChevronRight, ChevronDown, Plus, MoreHorizontal } from 'lucide-react';

interface CollectionFolderItemProps {
  item: CollectionItem;
  collectionId: string;
  depth: number;
  isOpen: boolean;
  editingId: string | null;
  editingName: string;
  onToggleFolder: (id: string) => void;
  onNewRequest: (colId: string, folderId?: string) => void;
  onStartEditing: (id: string, name: string) => void;
  onEditingNameChange: (name: string) => void;
  onCommitRename: (id: string) => void;
  onCancelRename: () => void;
  onOpenMenu: (e: React.MouseEvent, menuState: any) => void;
  childrenCount: number;
}

export const CollectionFolderItem: React.FC<CollectionFolderItemProps> = ({
  item,
  collectionId,
  depth,
  isOpen,
  editingId,
  editingName,
  onToggleFolder,
  onNewRequest,
  onEditingNameChange,
  onCommitRename,
  onCancelRename,
  onOpenMenu,
  childrenCount,
}) => {
  return (
    <div
      onClick={() => onToggleFolder(item.id)}
      style={{ paddingLeft: `${depth * 14 + 14}px` }}
      className="group flex items-center justify-between py-1 pr-2 text-xs text-[#cccccc] hover:bg-[#1e1e20] cursor-pointer select-none transition-colors"
    >
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-[#888888] shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-[#888888] shrink-0" />
        )}

        {editingId === item.id ? (
          <input
            type="text"
            value={editingName}
            onChange={(e) => onEditingNameChange(e.target.value)}
            onBlur={() => onCommitRename(item.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCommitRename(item.id);
              if (e.key === 'Escape') onCancelRename();
            }}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-[#1a1a1a] text-xs text-white px-1.5 py-0.5 rounded border border-[#d99b26] outline-none"
          />
        ) : (
          <span className="font-medium truncate">{item.name}</span>
        )}

        {childrenCount > 0 && (
          <span className="text-[10px] text-[#666666] font-mono">({childrenCount})</span>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNewRequest(collectionId, item.id);
          }}
          className="p-1 rounded text-[#888888] hover:text-white hover:bg-[#26292b] transition-colors cursor-pointer"
          title="New Request in folder"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button
          data-menu-id={item.id}
          onClick={(e) => {
            e.stopPropagation();
            onOpenMenu(e, {
              id: item.id,
              type: 'folder',
              collectionId,
              itemId: item.id,
              name: item.name,
              item,
            });
          }}
          className="p-1 rounded text-[#888888] hover:text-white hover:bg-[#26292b] transition-colors cursor-pointer"
          title="Folder options"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
