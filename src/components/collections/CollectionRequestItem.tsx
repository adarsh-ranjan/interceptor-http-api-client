import React from 'react';
import { CollectionItem, HttpRequest } from '../../types';
import { getMethodColor } from '../../utils/http';
import { MoreHorizontal } from 'lucide-react';

interface CollectionRequestItemProps {
  item: CollectionItem;
  collectionId: string;
  depth: number;
  isActive: boolean;
  editingId: string | null;
  editingName: string;
  onSelectRequest: (req: HttpRequest, collectionId?: string, itemId?: string) => void;
  onStartEditing: (id: string, name: string) => void;
  onEditingNameChange: (name: string) => void;
  onCommitRename: (id: string) => void;
  onCancelRename: () => void;
  onOpenMenu: (e: React.MouseEvent, menuState: any) => void;
}

export const CollectionRequestItem: React.FC<CollectionRequestItemProps> = ({
  item,
  collectionId,
  depth,
  isActive,
  editingId,
  editingName,
  onSelectRequest,
  onEditingNameChange,
  onCommitRename,
  onCancelRename,
  onOpenMenu,
}) => {
  const methodColor = getMethodColor(item.request.method);

  return (
    <div
      onClick={() => onSelectRequest(item.request, collectionId, item.id)}
      style={{ paddingLeft: `${depth * 14 + 16}px` }}
      className={`group flex items-center justify-between py-1 pr-2 text-xs cursor-pointer select-none transition-colors ${
        isActive
          ? 'bg-[#222224] text-white font-medium border-l-2 border-[#d99b26]'
          : 'text-[#aaaaaa] hover:bg-[#1e1e20] hover:text-[#cccccc]'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className={`font-mono font-bold text-[10px] shrink-0 ${methodColor.text}`}>
          {item.request.method}
        </span>
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
          <span className="truncate">{item.name}</span>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          data-menu-id={item.id}
          onClick={(e) => {
            e.stopPropagation();
            onOpenMenu(e, {
              id: item.id,
              type: 'request',
              collectionId,
              itemId: item.id,
              name: item.name,
              item,
            });
          }}
          className="p-1 rounded text-[#888888] hover:text-white hover:bg-[#26292b] transition-colors cursor-pointer"
          title="More options"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
