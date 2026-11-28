import React from 'react';
import { CollectionItem, HttpRequest } from '../../types';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { CollectionActionMenu } from './CollectionActionMenu';

interface CollectionRequestItemProps {
  item: CollectionItem;
  collectionId: string;
  isActive: boolean;
  isEditing: boolean;
  editingName: string;
  onSelect: (req: HttpRequest, collectionId: string, itemId: string) => void;
  onEditingNameChange: (name: string) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onStartRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  depth?: number;
}

export const CollectionRequestItem: React.FC<CollectionRequestItemProps> = ({
  item,
  collectionId,
  isActive,
  isEditing,
  editingName,
  onSelect,
  onEditingNameChange,
  onSaveRename,
  onCancelRename,
  onStartRename,
  onDuplicate,
  onDelete,
  depth = 1,
}) => {
  const method = item.request?.method || 'GET';

  const getMethodBadgeVariant = (m: string) => {
    switch (m.toUpperCase()) {
      case 'GET':
        return 'get';
      case 'POST':
        return 'post';
      case 'PUT':
        return 'put';
      case 'PATCH':
        return 'patch';
      case 'DELETE':
        return 'delete';
      default:
        return 'secondary';
    }
  };

  return (
    <div
      onClick={() => item.request && onSelect(item.request, collectionId, item.id)}
      style={{ paddingLeft: `${depth * 14 + 10}px` }}
      className={`group flex items-center justify-between py-1.5 pr-2 rounded-md text-xs cursor-pointer transition-colors ${
        isActive
          ? 'bg-[#26282c] text-foreground font-medium border-l-2 border-primary'
          : 'text-muted-foreground hover:bg-[#202226] hover:text-foreground'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
        <Badge
          variant={getMethodBadgeVariant(method) as any}
          className="px-1.5 py-0 text-[9px] font-bold shrink-0 tracking-tight"
        >
          {method}
        </Badge>

        {isEditing ? (
          <Input
            value={editingName}
            onChange={(e) => onEditingNameChange(e.target.value)}
            onBlur={onSaveRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveRename();
              if (e.key === 'Escape') onCancelRename();
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            className="h-6 text-xs py-0 px-1 bg-[#141517] w-full"
          />
        ) : (
          <span className="truncate">{item.name}</span>
        )}
      </div>

      <CollectionActionMenu
        type="request"
        onRename={onStartRename}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
    </div>
  );
};
