import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Collection, CollectionItem, HttpRequest, Environment } from '../../types';
import { exportToPostman, exportToInterceptor, parseCollectionFile } from '../../utils/postman';
import { CollectionTreeItem } from './CollectionTreeItem';
import { CollectionActionMenu } from './CollectionActionMenu';
import { CollectionDeleteDialog } from './CollectionDeleteDialog';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  MoreHorizontal,
  Upload,
  FolderTree,
  Search,
  X,
} from 'lucide-react';

export interface CollectionsViewProps {
  collections: Collection[];
  onSelectRequest: (req: HttpRequest, collectionId?: string, itemId?: string) => void;
  onUpdateCollections: (collections: Collection[]) => void;
  onNewRequestInCollection: (collectionId: string, folderId?: string) => void;
  onRunCollection: (collection: Collection) => void;
  environments?: Environment[];
  activeEnvId?: string | null;
  activeItemId?: string | null;
}

interface ActiveMenuState {
  id: string;
  type: 'collection' | 'folder' | 'request';
  collectionId: string;
  itemId?: string;
  name: string;
  item?: CollectionItem;
  collection?: Collection;
  anchorRect: DOMRect;
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

  const [activeMenu, setActiveMenu] = useState<ActiveMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{
    collectionId: string;
    itemId: string;
    itemName: string;
    isFolder: boolean;
  } | null>(null);

  useEffect(() => {
    if (!activeMenu) return;

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (menuRef.current && menuRef.current.contains(target)) return;
      if (target.closest(`[data-menu-id="${activeMenu.id}"]`)) return;
      setActiveMenu(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveMenu(null);
    };

    const handleScroll = (e: Event) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      setActiveMenu(null);
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
  }, [activeMenu]);

  const toggleFolder = (id: string) => {
    setOpenFolders((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id],
    }));
  };

  const handleStartRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
    setActiveMenu(null);
  };

  const handleCommitRename = (id: string) => {
    if (!editingName.trim()) {
      setEditingId(null);
      return;
    }
    const updateInTree = (items: CollectionItem[]): CollectionItem[] =>
      items.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            name: editingName.trim(),
            ...(item.request
              ? { request: { ...item.request, name: editingName.trim() } }
              : {}),
          };
        }
        if (item.children) {
          return { ...item, children: updateInTree(item.children) };
        }
        return item;
      });

    const updatedCols = collections.map((col) => {
      if (col.id === id) {
        return { ...col, name: editingName.trim(), updatedAt: Date.now() };
      }
      return { ...col, items: updateInTree(col.items), updatedAt: Date.now() };
    });

    onUpdateCollections(updatedCols);
    setEditingId(null);
  };

  const handleCancelRename = () => {
    setEditingId(null);
  };

  const handleNewFolder = (collectionId: string, parentFolderId?: string) => {
    const newFolderId = `folder-${Date.now()}`;
    const newFolder: CollectionItem = {
      id: newFolderId,
      name: 'New Folder',
      type: 'folder',
      children: [],
    };

    const addFolderToTree = (items: CollectionItem[]): CollectionItem[] => {
      if (!parentFolderId) return [...items, newFolder];
      return items.map((item) => {
        if (item.id === parentFolderId && item.type === 'folder') {
          return { ...item, children: [...(item.children || []), newFolder] };
        }
        if (item.children) {
          return { ...item, children: addFolderToTree(item.children) };
        }
        return item;
      });
    };

    const updated = collections.map((c) => {
      if (c.id === collectionId) {
        return {
          ...c,
          items: addFolderToTree(c.items),
          updatedAt: Date.now(),
        };
      }
      return c;
    });

    onUpdateCollections(updated);
    setOpenFolders((prev) => ({
      ...prev,
      [collectionId]: true,
      ...(parentFolderId ? { [parentFolderId]: true } : {}),
      [newFolderId]: true,
    }));
    setActiveMenu(null);
    setEditingId(newFolderId);
    setEditingName('New Folder');
  };

  const handleCloneItem = (collectionId: string, itemToClone: CollectionItem) => {
    const cloneRec = (item: CollectionItem): CollectionItem => ({
      ...item,
      id: `${item.type}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${item.name} (Copy)`,
      ...(item.request
        ? {
            request: {
              ...item.request,
              id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: `${item.name} (Copy)`,
            },
          }
        : {}),
      children: item.children ? item.children.map(cloneRec) : undefined,
    });

    const cloned = cloneRec(itemToClone);

    const insertClone = (items: CollectionItem[]): CollectionItem[] => {
      const idx = items.findIndex((i) => i.id === itemToClone.id);
      if (idx !== -1) {
        const next = [...items];
        next.splice(idx + 1, 0, cloned);
        return next;
      }
      return items.map((i) => {
        if (i.children) return { ...i, children: insertClone(i.children) };
        return i;
      });
    };

    onUpdateCollections(
      collections.map((c) =>
        c.id === collectionId
          ? { ...c, items: insertClone(c.items), updatedAt: Date.now() }
          : c
      )
    );
    setActiveMenu(null);
  };

  const handleExport = (collection: Collection, format: 'postman' | 'interceptor') => {
    const jsonStr =
      format === 'postman'
        ? exportToPostman(collection)
        : exportToInterceptor(collection);
    const fileName = `${collection.name.toLowerCase().replace(/\s+/g, '_')}_${format}.json`;
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    setActiveMenu(null);
  };

  const handleImportCollection = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = parseCollectionFile(text);
        if (parsed) {
          onUpdateCollections([...collections, parsed]);
        } else {
          alert('Failed to parse collection file. Please ensure it is valid Postman v2.1 or Interceptor JSON format.');
        }
      } catch (err: any) {
        alert(`Error importing collection: ${err.message}`);
      }
    };
    input.click();
  };

  const handleCreateCollection = () => {
    const newId = `col-${Date.now()}`;
    const newCol: Collection = {
      id: newId,
      name: 'New Collection',
      items: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onUpdateCollections([...collections, newCol]);
    setOpenFolders((prev) => ({ ...prev, [newId]: true }));
    setEditingId(newId);
    setEditingName('New Collection');
  };

  const handleConfirmDelete = () => {
    if (collectionToDelete) {
      onUpdateCollections(collections.filter((c) => c.id !== collectionToDelete.id));
      setCollectionToDelete(null);
    } else if (itemToDelete) {
      const removeFromTree = (items: CollectionItem[]): CollectionItem[] =>
        items
          .filter((i) => i.id !== itemToDelete.itemId)
          .map((i) => {
            if (i.children) return { ...i, children: removeFromTree(i.children) };
            return i;
          });

      onUpdateCollections(
        collections.map((c) =>
          c.id === itemToDelete.collectionId
            ? { ...c, items: removeFromTree(c.items), updatedAt: Date.now() }
            : c
        )
      );
      setItemToDelete(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] text-xs select-none">
      {/* Header with Search and Actions */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#333333] shrink-0">
        <span className="font-semibold text-xs tracking-wider text-[#888888] uppercase">
          Collections
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-1 rounded text-[#888888] hover:text-white hover:bg-[#26292b] transition-colors cursor-pointer"
            title="Search requests"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleImportCollection}
            className="p-1 rounded text-[#888888] hover:text-white hover:bg-[#26292b] transition-colors cursor-pointer"
            title="Import collection (Postman/Interceptor JSON)"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCreateCollection}
            className="p-1 rounded text-[#888888] hover:text-white hover:bg-[#26292b] transition-colors cursor-pointer"
            title="New collection"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search Input Filter */}
      {showSearch && (
        <div className="px-3 py-1.5 border-b border-[#333333] bg-[#1e1e20] flex items-center gap-1.5 shrink-0">
          <Search className="w-3.5 h-3.5 text-[#666666]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter requests..."
            className="w-full bg-transparent text-xs text-white placeholder:text-[#666666] outline-none"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-[#666666] hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Collections Tree List */}
      <div className="flex-1 overflow-y-auto py-1">
        {collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-[#666666] text-xs p-4 text-center">
            <FolderTree className="w-8 h-8 stroke-1 text-[#444444] mb-2" />
            <p>No collections yet</p>
            <button
              onClick={handleCreateCollection}
              className="mt-2 text-[#d99b26] hover:underline cursor-pointer"
            >
              Create collection
            </button>
          </div>
        ) : (
          collections.map((col) => {
            const isColOpen = openFolders[col.id] !== false;

            return (
              <div key={col.id} className="flex flex-col">
                {/* Collection Root Header Row */}
                <div
                  onClick={() => toggleFolder(col.id)}
                  className="group flex items-center justify-between px-2.5 py-1.5 text-xs text-white hover:bg-[#222224] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {isColOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-[#888888] shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-[#888888] shrink-0" />
                    )}

                    {editingId === col.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => handleCommitRename(col.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCommitRename(col.id);
                          if (e.key === 'Escape') handleCancelRename();
                        }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-[#1a1a1a] text-xs text-white px-1.5 py-0.5 rounded border border-[#d99b26] outline-none"
                      />
                    ) : (
                      <span className="font-semibold truncate">{col.name}</span>
                    )}

                    <span className="text-[10px] text-[#666666] font-mono">
                      ({col.items.length})
                    </span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNewRequestInCollection(col.id);
                      }}
                      className="p-1 rounded text-[#888888] hover:text-white hover:bg-[#26292b] transition-colors cursor-pointer"
                      title="New Request in collection"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      data-menu-id={col.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setActiveMenu({
                          id: col.id,
                          type: 'collection',
                          collectionId: col.id,
                          name: col.name,
                          collection: col,
                          anchorRect: rect,
                        });
                      }}
                      className="p-1 rounded text-[#888888] hover:text-white hover:bg-[#26292b] transition-colors cursor-pointer"
                      title="Collection options"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Collection Children */}
                {isColOpen && (
                  <div className="flex flex-col">
                    {col.items.map((item) => (
                      <CollectionTreeItem
                        key={item.id}
                        item={item}
                        collectionId={col.id}
                        depth={0}
                        openFolders={openFolders}
                        editingId={editingId}
                        editingName={editingName}
                        activeItemId={activeItemId}
                        onSelectRequest={onSelectRequest}
                        onToggleFolder={toggleFolder}
                        onNewRequest={onNewRequestInCollection}
                        onStartEditing={handleStartRename}
                        onEditingNameChange={setEditingName}
                        onCommitRename={handleCommitRename}
                        onCancelRename={handleCancelRename}
                        onOpenMenu={(e, menuState) => {
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setActiveMenu({ ...menuState, anchorRect: rect });
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Floating Action Menu */}
      {activeMenu &&
        createPortal(
          <CollectionActionMenu
            activeMenu={activeMenu}
            menuRef={menuRef}
            onRunCollection={(c) => {
              onRunCollection(c);
              setActiveMenu(null);
            }}
            onNewRequest={(cId, fId) => {
              onNewRequestInCollection(cId, fId);
              setActiveMenu(null);
            }}
            onNewFolder={handleNewFolder}
            onStartRename={handleStartRename}
            onCloneItem={handleCloneItem}
            onExportCollection={handleExport}
            onRequestDeleteCollection={(c) => {
              setCollectionToDelete(c);
              setActiveMenu(null);
            }}
            onRequestDeleteItem={(cId, iId, name, isFolder) => {
              setItemToDelete({ collectionId: cId, itemId: iId, itemName: name, isFolder });
              setActiveMenu(null);
            }}
          />,
          document.body
        )}

      {/* Delete Dialogs */}
      {collectionToDelete && (
        <CollectionDeleteDialog
          title="Delete Collection"
          description="Are you sure you want to delete this collection"
          name={collectionToDelete.name}
          onConfirm={handleConfirmDelete}
          onCancel={() => setCollectionToDelete(null)}
        />
      )}

      {itemToDelete && (
        <CollectionDeleteDialog
          title={`Delete ${itemToDelete.isFolder ? 'Folder' : 'Request'}`}
          description={`Are you sure you want to delete this ${itemToDelete.isFolder ? 'folder' : 'request'}`}
          name={itemToDelete.itemName}
          onConfirm={handleConfirmDelete}
          onCancel={() => setItemToDelete(null)}
        />
      )}
    </div>
  );
};
