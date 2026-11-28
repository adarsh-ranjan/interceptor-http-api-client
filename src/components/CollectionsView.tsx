import React, { useState, useRef } from 'react';
import { Collection, CollectionItem, HttpRequest, Environment } from '../types';
import { exportToPostman, exportToInterceptor, parseCollectionFile } from '../utils/postman';
import { CollectionTreeItem } from './collections/CollectionTreeItem';
import { CollectionDeleteDialog } from './collections/CollectionDeleteDialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Plus, Upload, Search, X, FolderTree } from 'lucide-react';

interface CollectionsViewProps {
  collections: Collection[];
  onSelectRequest: (req: HttpRequest, collectionId?: string, itemId?: string) => void;
  onUpdateCollections: (collections: Collection[]) => void;
  onNewRequestInCollection: (collectionId: string, folderId?: string) => void;
  onRunCollection: (collection: Collection) => void;
  environments?: Environment[];
  activeEnvId?: string | null;
  activeItemId?: string | null;
}

interface DeleteTarget {
  id: string;
  name: string;
  type: 'collection' | 'folder' | 'request';
  collectionId?: string;
  count?: number;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  collections,
  onSelectRequest,
  onUpdateCollections,
  onNewRequestInCollection,
  onRunCollection,
  activeItemId,
}) => {
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleFolder = (id: string) => {
    setOpenFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const handleSaveRename = () => {
    if (!editingId) return;
    const targetId = editingId;
    const newName = editingName.trim();
    setEditingId(null);

    if (!newName) return;

    const updateItemName = (items: CollectionItem[]): CollectionItem[] => {
      return items.map((item) => {
        if (item.id === targetId) {
          return {
            ...item,
            name: newName,
            request: item.request ? { ...item.request, name: newName } : undefined,
          };
        }
        if (item.children) {
          return { ...item, children: updateItemName(item.children) };
        }
        return item;
      });
    };

    const updated = collections.map((col) => {
      if (col.id === targetId) {
        return { ...col, name: newName, updatedAt: Date.now() };
      }
      return { ...col, items: updateItemName(col.items), updatedAt: Date.now() };
    });

    onUpdateCollections(updated);
  };

  const handleCreateCollection = () => {
    const newCol: Collection = {
      id: `col-${Date.now()}`,
      name: `New Collection ${collections.length + 1}`,
      items: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onUpdateCollections([...collections, newCol]);
    setOpenFolders((prev) => ({ ...prev, [newCol.id]: true }));
  };

  const handleCreateFolder = (collectionId: string, parentFolderId?: string) => {
    const newFolder: CollectionItem = {
      id: `folder-${Date.now()}`,
      name: 'New Folder',
      type: 'folder',
      children: [],
    };

    if (!parentFolderId) {
      const updated = collections.map((col) => {
        if (col.id === collectionId) {
          return { ...col, items: [...col.items, newFolder], updatedAt: Date.now() };
        }
        return col;
      });
      onUpdateCollections(updated);
      setOpenFolders((prev) => ({ ...prev, [collectionId]: true, [newFolder.id]: true }));
    } else {
      const addToFolder = (items: CollectionItem[]): CollectionItem[] => {
        return items.map((item) => {
          if (item.id === parentFolderId) {
            return {
              ...item,
              children: [...(item.children || []), newFolder],
            };
          }
          if (item.children) {
            return { ...item, children: addToFolder(item.children) };
          }
          return item;
        });
      };

      const updated = collections.map((col) => {
        if (col.id === collectionId) {
          return { ...col, items: addToFolder(col.items), updatedAt: Date.now() };
        }
        return col;
      });
      onUpdateCollections(updated);
      setOpenFolders((prev) => ({
        ...prev,
        [collectionId]: true,
        [parentFolderId]: true,
        [newFolder.id]: true,
      }));
    }
  };

  const handleDuplicateItem = (collectionId: string, itemId: string) => {
    const duplicateInItems = (items: CollectionItem[]): CollectionItem[] => {
      const result: CollectionItem[] = [];
      for (const item of items) {
        result.push(item);
        if (item.id === itemId) {
          const cloneId = `${item.type}-${Date.now()}`;
          const clonedReq = item.request
            ? { ...item.request, id: `req-${Date.now()}`, name: `${item.name} (Copy)` }
            : undefined;

          result.push({
            ...item,
            id: cloneId,
            name: `${item.name} (Copy)`,
            request: clonedReq,
            children: item.children ? JSON.parse(JSON.stringify(item.children)) : undefined,
          });
        } else if (item.children) {
          item.children = duplicateInItems(item.children);
        }
      }
      return result;
    };

    const updated = collections.map((col) => {
      if (col.id === collectionId) {
        return { ...col, items: duplicateInItems(col.items), updatedAt: Date.now() };
      }
      return col;
    });

    onUpdateCollections(updated);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'collection') {
      onUpdateCollections(collections.filter((c) => c.id !== deleteTarget.id));
    } else {
      const removeFromItems = (items: CollectionItem[]): CollectionItem[] => {
        return items
          .filter((i) => i.id !== deleteTarget.id)
          .map((i) => (i.children ? { ...i, children: removeFromItems(i.children) } : i));
      };

      const updated = collections.map((col) => {
        if (col.id === deleteTarget.collectionId) {
          return { ...col, items: removeFromItems(col.items), updatedAt: Date.now() };
        }
        return col;
      });
      onUpdateCollections(updated);
    }

    setDeleteTarget(null);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const parsed = parseCollectionFile(content);
      if (parsed) {
        onUpdateCollections([...collections, parsed]);
        setOpenFolders((prev) => ({ ...prev, [parsed.id]: true }));
      }
    } catch (err) {
      console.error('Failed to import collection file', err);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredCollections = collections.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const hasMatchInItems = (items: CollectionItem[]): boolean => {
      return items.some(
        (i) => i.name.toLowerCase().includes(q) || (i.children && hasMatchInItems(i.children))
      );
    };
    return c.name.toLowerCase().includes(q) || hasMatchInItems(c.items);
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1a1b1e] border-r border-border overflow-hidden select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-[#141517]">
        <span className="text-xs font-semibold text-foreground tracking-wide">
          COLLECTIONS
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowSearch(!showSearch)}
            title="Search Collections"
            className="text-muted-foreground hover:text-foreground"
          >
            <Search className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => fileInputRef.current?.click()}
            title="Import Collection File"
            className="text-muted-foreground hover:text-foreground"
          >
            <Upload className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="amber"
            size="icon-sm"
            onClick={handleCreateCollection}
            title="Create New Collection"
            className="h-6 w-6"
          >
            <Plus className="w-3.5 h-3.5 text-black" />
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
      </div>

      {/* Optional Search Bar */}
      {showSearch && (
        <div className="p-2 border-b border-border bg-[#141517]/50 flex items-center gap-1">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter collections..."
            className="h-7 text-xs bg-[#1a1b1e]"
            autoFocus
          />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setSearchQuery('');
              setShowSearch(false);
            }}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Collections Tree */}
      <ScrollArea className="flex-1 p-2">
        {filteredCollections.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
            <FolderTree className="w-7 h-7 mx-auto text-muted-foreground/30" />
            <p>No collections found</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateCollection}
              className="text-xs mt-1"
            >
              Create Collection
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredCollections.map((col) => (
              <CollectionTreeItem
                key={col.id}
                collection={col}
                isOpen={!!openFolders[col.id]}
                onToggle={toggleFolder}
                activeItemId={activeItemId}
                editingId={editingId}
                editingName={editingName}
                onSelectRequest={onSelectRequest}
                onStartRename={handleStartRename}
                onEditingNameChange={setEditingName}
                onSaveRename={handleSaveRename}
                onCancelRename={() => setEditingId(null)}
                onAddRequest={(colId, folderId) => onNewRequestInCollection(colId, folderId)}
                onAddSubfolder={handleCreateFolder}
                onRunCollection={onRunCollection}
                onDuplicateItem={handleDuplicateItem}
                onDeleteCollection={(c) =>
                  setDeleteTarget({
                    id: c.id,
                    name: c.name,
                    type: 'collection',
                    count: c.items.length,
                  })
                }
                onDeleteItem={(colId, itemId, name, isFolder) =>
                  setDeleteTarget({
                    id: itemId,
                    name,
                    type: isFolder ? 'folder' : 'request',
                    collectionId: colId,
                  })
                }
                onExportPostman={(c) => exportToPostman(c)}
                onExportInterceptor={(c) => exportToInterceptor(c)}
                openFolders={openFolders}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Delete Confirmation Modal */}
      <CollectionDeleteDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
