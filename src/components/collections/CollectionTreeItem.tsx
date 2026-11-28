import React from 'react';
import { Collection, CollectionItem, HttpRequest } from '../../types';
import { CollectionFolderItem } from './CollectionFolderItem';
import { CollectionRequestItem } from './CollectionRequestItem';
import { CollectionActionMenu } from './CollectionActionMenu';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ChevronRight, ChevronDown, Plus } from 'lucide-react';

interface CollectionTreeItemProps {
  collection: Collection;
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
  onAddRequest: (collectionId: string, folderId?: string) => void;
  onAddSubfolder: (collectionId: string, parentFolderId?: string) => void;
  onRunCollection: (collection: Collection) => void;
  onDuplicateItem: (collectionId: string, itemId: string) => void;
  onDeleteCollection: (collection: Collection) => void;
  onDeleteItem: (collectionId: string, itemId: string, name: string, isFolder: boolean) => void;
  onExportPostman: (collection: Collection) => void;
  onExportInterceptor: (collection: Collection) => void;
  openFolders: Record<string, boolean>;
}

export const CollectionTreeItem: React.FC<CollectionTreeItemProps> = ({
  collection,
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
  onRunCollection,
  onDuplicateItem,
  onDeleteCollection,
  onDeleteItem,
  onExportPostman,
  onExportInterceptor,
  openFolders,
}) => {
  const isEditing = editingId === collection.id;

  const countTotalRequests = (items: CollectionItem[]): number => {
    let count = 0;
    for (const item of items) {
      if (item.type === 'request') count++;
      if (item.children) count += countTotalRequests(item.children);
    }
    return count;
  };

  const totalReqCount = countTotalRequests(collection.items);

  return (
    <div className="space-y-0.5">
      {/* Top Level Collection Row */}
      <div
        onClick={() => onToggle(collection.id)}
        className="group flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs cursor-pointer text-foreground hover:bg-[#202226] transition-colors select-none"
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
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
            <span className="font-semibold truncate tracking-tight">{collection.name}</span>
          )}

          <span className="text-[10px] text-muted-foreground/60 font-mono">
            ({totalReqCount})
          </span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onAddRequest(collection.id)}
            title="Add Request to Collection"
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground h-5 w-5"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>

          <CollectionActionMenu
            type="collection"
            onRun={() => onRunCollection(collection)}
            onAddRequest={() => onAddRequest(collection.id)}
            onAddFolder={() => onAddSubfolder(collection.id)}
            onRename={() => onStartRename(collection.id, collection.name)}
            onExportPostman={() => onExportPostman(collection)}
            onExportInterceptor={() => onExportInterceptor(collection)}
            onDelete={() => onDeleteCollection(collection)}
          />
        </div>
      </div>

      {/* Collection Children */}
      {isOpen && collection.items.length > 0 && (
        <div className="space-y-0.5">
          {collection.items.map((item) => {
            if (item.type === 'folder') {
              return (
                <CollectionFolderItem
                  key={item.id}
                  item={item}
                  collectionId={collection.id}
                  isOpen={!!openFolders[item.id]}
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
                  depth={1}
                />
              );
            }
            return (
              <CollectionRequestItem
                key={item.id}
                item={item}
                collectionId={collection.id}
                isActive={item.id === activeItemId}
                isEditing={editingId === item.id}
                editingName={editingName}
                onSelect={onSelectRequest}
                onEditingNameChange={onEditingNameChange}
                onSaveRename={onSaveRename}
                onCancelRename={onCancelRename}
                onStartRename={() => onStartRename(item.id, item.name)}
                onDuplicate={() => onDuplicateItem(collection.id, item.id)}
                onDelete={() => onDeleteItem(collection.id, item.id, item.name, false)}
                depth={1}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
