import React from 'react';
import { CollectionItem, HttpRequest } from '../../types';
import { CollectionRequestItem } from './CollectionRequestItem';
import { CollectionActionMenu } from './CollectionActionMenu';
import { Input } from '../ui/input';
import { ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';

interface CollectionFolderItemProps {
  item: CollectionItem;
  collectionId: string;
  isOpen: boolean;
  onToggle: (id: string) => void;
  activeItemId?: string | null;
  editingId: string | null;
  editingName: string;
  onSelectRequest: (req: HttpRequest, collectionId: string, itemId: string) => void;
  onStartRename: (id: string, name: string) => void;
  onEditingNameChange: (name: string) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onAddRequest: (collectionId: string, folderId: string) => void;
  onAddSubfolder: (collectionId: string, parentFolderId: string) => void;
  onDuplicateItem: (collectionId: string, itemId: string) => void;
  onDeleteItem: (collectionId: string, itemId: string, name: string, isFolder: boolean) => void;
  openFolders: Record<string, boolean>;
  depth?: number;
}

export const CollectionFolderItem: React.FC<CollectionFolderItemProps> = ({
  item,
  collectionId,
  isOpen,
  onToggle,
  activeItemId,
  editingId,
  editingName,
  onSelectRequest,
  onStartRename,
  onEditingNameChange,
  onSaveRename,
  onCancelRename,
  onAddRequest,
  onAddSubfolder,
  onDuplicateItem,
  onDeleteItem,
  openFolders,
  depth = 1,
}) => {
  const isEditing = editingId === item.id;
  const childCount = item.children?.length || 0;

  return (
    <div>
      {/* Folder Header */}
      <div
        onClick={() => onToggle(item.id)}
        style={{ paddingLeft: `${depth * 14 + 10}px` }}
        className="group flex items-center justify-between py-1.5 pr-2 rounded-md text-xs cursor-pointer text-muted-foreground hover:bg-[#202226] hover:text-foreground transition-colors"
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground/80" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground/80" />
          )}

          {isOpen ? (
            <FolderOpen className="w-3.5 h-3.5 text-primary shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-primary/80 shrink-0" />
          )}

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
            <span className="truncate font-medium">{item.name}</span>
          )}

          {childCount > 0 && (
            <span className="text-[10px] text-muted-foreground/70 font-mono">
              ({childCount})
            </span>
          )}
        </div>

        <CollectionActionMenu
          type="folder"
          onAddRequest={() => onAddRequest(collectionId, item.id)}
          onAddFolder={() => onAddSubfolder(collectionId, item.id)}
          onRename={() => onStartRename(item.id, item.name)}
          onDelete={() => onDeleteItem(collectionId, item.id, item.name, true)}
        />
      </div>

      {/* Nested Children */}
      {isOpen && item.children && item.children.length > 0 && (
        <div className="space-y-0.5">
          {item.children.map((child) => {
            if (child.type === 'folder') {
              return (
                <CollectionFolderItem
                  key={child.id}
                  item={child}
                  collectionId={collectionId}
                  isOpen={!!openFolders[child.id]}
                  onToggle={onToggle}
                  activeItemId={activeItemId}
                  editingId={editingId}
                  editingName={editingName}
                  onSelectRequest={onSelectRequest}
                  onStartRename={onStartRename}
                  onEditingNameChange={onEditingNameChange}
                  onSaveRename={onSaveRename}
                  onCancelRename={onCancelRename}
                  onAddRequest={onAddRequest}
                  onAddSubfolder={onAddSubfolder}
                  onDuplicateItem={onDuplicateItem}
                  onDeleteItem={onDeleteItem}
                  openFolders={openFolders}
                  depth={depth + 1}
                />
              );
            }
            return (
              <CollectionRequestItem
                key={child.id}
                item={child}
                collectionId={collectionId}
                isActive={child.id === activeItemId}
                isEditing={editingId === child.id}
                editingName={editingName}
                onSelect={onSelectRequest}
                onEditingNameChange={onEditingNameChange}
                onSaveRename={onSaveRename}
                onCancelRename={onCancelRename}
                onStartRename={() => onStartRename(child.id, child.name)}
                onDuplicate={() => onDuplicateItem(collectionId, child.id)}
                onDelete={() => onDeleteItem(collectionId, child.id, child.name, false)}
                depth={depth + 1}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
