import React from 'react';
import { CollectionItem, HttpRequest } from '../../types';
import { CollectionFolderItem } from './CollectionFolderItem';
import { CollectionRequestItem } from './CollectionRequestItem';

interface CollectionTreeItemProps {
  item: CollectionItem;
  collectionId: string;
  depth?: number;
  openFolders: Record<string, boolean>;
  editingId: string | null;
  editingName: string;
  activeItemId?: string | null;
  onSelectRequest: (req: HttpRequest, collectionId?: string, itemId?: string) => void;
  onToggleFolder: (id: string) => void;
  onNewRequest: (colId: string, folderId?: string) => void;
  onStartEditing: (id: string, name: string) => void;
  onEditingNameChange: (name: string) => void;
  onCommitRename: (id: string) => void;
  onCancelRename: () => void;
  onOpenMenu: (e: React.MouseEvent, menuState: any) => void;
}

export const CollectionTreeItem: React.FC<CollectionTreeItemProps> = ({
  item,
  collectionId,
  depth = 0,
  openFolders,
  editingId,
  editingName,
  activeItemId,
  onSelectRequest,
  onToggleFolder,
  onNewRequest,
  onStartEditing,
  onEditingNameChange,
  onCommitRename,
  onCancelRename,
  onOpenMenu,
}) => {
  if (item.type === 'folder') {
    const isOpen = openFolders[item.id] !== false;
    const children = item.children || [];

    return (
      <div key={item.id} className="flex flex-col">
        <CollectionFolderItem
          item={item}
          collectionId={collectionId}
          depth={depth}
          isOpen={isOpen}
          editingId={editingId}
          editingName={editingName}
          onToggleFolder={onToggleFolder}
          onNewRequest={onNewRequest}
          onStartEditing={onStartEditing}
          onEditingNameChange={onEditingNameChange}
          onCommitRename={onCommitRename}
          onCancelRename={onCancelRename}
          onOpenMenu={onOpenMenu}
          childrenCount={children.length}
        />

        {isOpen && (
          <div className="flex flex-col">
            {children.map((child) => (
              <CollectionTreeItem
                key={child.id}
                item={child}
                collectionId={collectionId}
                depth={depth + 1}
                openFolders={openFolders}
                editingId={editingId}
                editingName={editingName}
                activeItemId={activeItemId}
                onSelectRequest={onSelectRequest}
                onToggleFolder={onToggleFolder}
                onNewRequest={onNewRequest}
                onStartEditing={onStartEditing}
                onEditingNameChange={onEditingNameChange}
                onCommitRename={onCommitRename}
                onCancelRename={onCancelRename}
                onOpenMenu={onOpenMenu}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isActive = activeItemId === item.id || activeItemId === item.request.id;

  return (
    <CollectionRequestItem
      key={item.id}
      item={item}
      collectionId={collectionId}
      depth={depth}
      isActive={isActive}
      editingId={editingId}
      editingName={editingName}
      onSelectRequest={onSelectRequest}
      onStartEditing={onStartEditing}
      onEditingNameChange={onEditingNameChange}
      onCommitRename={onCommitRename}
      onCancelRename={onCancelRename}
      onOpenMenu={onOpenMenu}
    />
  );
};
