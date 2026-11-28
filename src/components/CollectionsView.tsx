import React, { useState } from 'react';
import { Collection, CollectionItem, Environment, HttpRequest } from '../types';
import { openTextFile, saveTextFile } from '../services/fileService';
import {
  addItemToTree,
  collectionMatchesQuery,
  countRequestsInTree,
  duplicateItemInTree,
  itemOrDescendantMatches,
  removeItemFromTree,
  renameItemInTree,
} from '../utils/collectionTree';
import { getMethodColor } from '../utils/http';
import { exportToInterceptor, exportToPostman, parseCollectionFile } from '../utils/postman';
import {
  ChevronDown,
  ChevronRight,
  FolderTree,
  MoreHorizontal,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { ActiveMenuState, CollectionContextMenu } from './collections/CollectionContextMenu';
import { DeleteConfirmModal } from './collections/DeleteConfirmModal';
import { InlineRenameInput } from './collections/InlineRenameInput';

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

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  collections,
  onSelectRequest,
  onUpdateCollections,
  onNewRequestInCollection,
  onRunCollection,
  environments,
  activeEnvId,
  activeItemId,
}) => {
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const [activeMenu, setActiveMenu] = useState<ActiveMenuState | null>(null);
  const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{
    collectionId: string;
    itemId: string;
    itemName: string;
    isFolder: boolean;
  } | null>(null);

  const toggleFolder = (id: string) => {
    setOpenFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
    setActiveMenu(null);
  };

  const handleSaveRename = () => {
    if (!editingId) return;
    const targetId = editingId;
    const newName = editingName.trim();
    setEditingId(null);

    if (!newName) return;

    const updated = collections.map((col) => {
      if (col.id === targetId) {
        return { ...col, name: newName, updatedAt: Date.now() };
      }
      return {
        ...col,
        items: renameItemInTree(col.items, targetId, newName),
        updatedAt: Date.now(),
      };
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

    const updated = collections.map((col) =>
      col.id === collectionId
        ? {
            ...col,
            items: addItemToTree(col.items, newFolder, parentFolderId),
            updatedAt: Date.now(),
          }
        : col
    );

    onUpdateCollections(updated);
    setOpenFolders((prev) => ({
      ...prev,
      [collectionId]: true,
      ...(parentFolderId ? { [parentFolderId]: true } : {}),
      [newFolder.id]: true,
    }));
    setActiveMenu(null);
  };

  const handleDuplicateItem = (collectionId: string, itemId: string) => {
    const updated = collections.map((col) =>
      col.id === collectionId
        ? { ...col, items: duplicateItemInTree(col.items, itemId), updatedAt: Date.now() }
        : col
    );
    onUpdateCollections(updated);
    setActiveMenu(null);
  };

  const confirmDeleteCollection = () => {
    if (!collectionToDelete) return;
    onUpdateCollections(collections.filter((c) => c.id !== collectionToDelete.id));
    setCollectionToDelete(null);
    setActiveMenu(null);
  };

  const confirmDeleteItem = () => {
    if (!itemToDelete) return;
    const { collectionId, itemId } = itemToDelete;
    const updated = collections.map((col) =>
      col.id === collectionId
        ? { ...col, items: removeItemFromTree(col.items, itemId), updatedAt: Date.now() }
        : col
    );
    onUpdateCollections(updated);
    setItemToDelete(null);
    setActiveMenu(null);
  };

  const handleExport = async (col: Collection, format: 'postman' | 'interceptor') => {
    let content: string;
    let fileName: string;

    if (format === 'postman') {
      const activeEnv = (environments || []).find((e) => e.id === activeEnvId);
      const envVarsRecord: Record<string, string> = {};
      if (activeEnv) {
        activeEnv.variables.forEach((v) => {
          if (v.enabled) envVarsRecord[v.key] = v.value;
        });
      }
      content = exportToPostman(col, envVarsRecord);
      fileName = `${col.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.postman_collection.json`;
    } else {
      content = exportToInterceptor(col);
      fileName = `${col.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_interceptor.json`;
    }

    await saveTextFile({
      defaultPath: fileName,
      content,
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
    });
    setActiveMenu(null);
  };

  const handleImport = async () => {
    try {
      const content = await openTextFile({
        accept: '.json',
        filters: [{ name: 'Collection JSON', extensions: ['json'] }],
      });
      if (!content) return;

      const parsed = parseCollectionFile(content);
      onUpdateCollections([...collections, parsed]);
      setOpenFolders((prev) => ({ ...prev, [parsed.id]: true }));
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    }
  };

  const handleAddRequestWithExpand = (collectionId: string, folderId?: string) => {
    setActiveMenu(null);
    onNewRequestInCollection(collectionId, folderId);
    setOpenFolders((prev) => ({
      ...prev,
      [folderId || collectionId]: true,
    }));
  };

  const openMenuForTarget = (
    e: React.MouseEvent<HTMLButtonElement>,
    state: Omit<ActiveMenuState, 'anchorRect'>
  ) => {
    e.stopPropagation();
    if (activeMenu?.id === state.id) {
      setActiveMenu(null);
    } else {
      setActiveMenu({
        ...state,
        anchorRect: e.currentTarget.getBoundingClientRect(),
      });
    }
  };

  const renderItem = (item: CollectionItem, collectionId: string, level = 1) => {
    if (searchQuery.trim() && !itemOrDescendantMatches(item, searchQuery)) {
      return null;
    }

    const isFolder = item.type === 'folder';
    const isOpen = searchQuery.trim() ? true : (openFolders[item.id] ?? false);
    const isMenuOpen = activeMenu?.id === item.id;
    const isSelected = activeItemId === item.id;
    const isEditing = editingId === item.id;

    if (isFolder) {
      return (
        <div key={item.id} className="select-none flex flex-col">
          <div
            className={`group relative flex items-center justify-between py-1 px-1.5 rounded cursor-pointer transition-colors ${
              isMenuOpen ? 'bg-[#26292b]' : 'hover:bg-[#222224]'
            }`}
            style={{ paddingLeft: `${8 + level * 14}px` }}
          >
            <div
              className="flex items-center gap-1.5 flex-1 min-w-0"
              onClick={() => !isEditing && toggleFolder(item.id)}
            >
              <button
                type="button"
                className="text-[#888888] group-hover:text-[#cccccc] transition-colors p-0.5"
              >
                {isOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>

              {isEditing ? (
                <InlineRenameInput
                  value={editingName}
                  onChange={setEditingName}
                  onSave={handleSaveRename}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <span className="truncate text-[#cccccc] font-medium text-xs group-hover:text-white">
                  {item.name}
                </span>
              )}
            </div>

            {!isEditing && (
              <div
                className={`flex items-center gap-0.5 transition-opacity ${
                  isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddRequestWithExpand(collectionId, item.id);
                  }}
                  className="p-1 text-[#888888] hover:text-white rounded hover:bg-[#26292b] transition-colors cursor-pointer"
                  title="Add request"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>

                <button
                  data-menu-id={item.id}
                  onClick={(e) =>
                    openMenuForTarget(e, {
                      id: item.id,
                      type: 'folder',
                      collectionId,
                      itemId: item.id,
                      name: item.name,
                      item,
                    })
                  }
                  className={`p-1 rounded transition-colors cursor-pointer ${
                    isMenuOpen
                      ? 'text-white bg-[#26292b]'
                      : 'text-[#888888] hover:text-white hover:bg-[#26292b]'
                  }`}
                  title="More options"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {isOpen && (
            <div className="relative flex flex-col space-y-0.5 mt-0.5">
              <div
                className="absolute top-0 bottom-0 border-l border-[#333333]"
                style={{ left: `${14 + level * 14}px` }}
              />
              {item.children && item.children.length > 0 ? (
                item.children.map((child) => renderItem(child, collectionId, level + 1))
              ) : (
                <p
                  className="text-[11px] text-slate-500 italic py-1"
                  style={{ paddingLeft: `${22 + level * 14}px` }}
                >
                  Empty folder
                </p>
              )}
            </div>
          )}
        </div>
      );
    }

    const req = item.request;
    const methodColor = req
      ? getMethodColor(req.method)
      : { bg: '', text: 'text-slate-400', border: '' };

    return (
      <div
        key={item.id}
        onClick={() => {
          if (isEditing) return;
          setActiveMenu(null);
          req && onSelectRequest(req, collectionId, item.id);
        }}
        style={{ paddingLeft: `${8 + level * 14}px` }}
        className={`group relative flex items-center justify-between py-1 px-1.5 rounded cursor-pointer transition-colors ${
          isSelected
            ? 'bg-[#222224] text-white font-medium'
            : isMenuOpen
              ? 'bg-[#222224]'
              : 'hover:bg-[#222224] text-[#cccccc]'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {req && (
            <span className={`font-mono font-bold text-[10px] shrink-0 text-left ${methodColor.text}`}>
              {req.method}
            </span>
          )}
          {isEditing ? (
            <InlineRenameInput
              value={editingName}
              onChange={setEditingName}
              onSave={handleSaveRename}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <span className="truncate text-xs group-hover:text-white">{item.name}</span>
          )}
        </div>

        {!isEditing && (
          <div
            className={`flex items-center transition-opacity ${
              isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <button
              data-menu-id={item.id}
              onClick={(e) =>
                openMenuForTarget(e, {
                  id: item.id,
                  type: 'request',
                  collectionId,
                  itemId: item.id,
                  name: item.name,
                  item,
                })
              }
              className={`p-1 rounded transition-colors cursor-pointer ${
                isMenuOpen
                  ? 'text-white bg-[#26292b]'
                  : 'text-[#888888] hover:text-white hover:bg-[#26292b]'
              }`}
              title="More options"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full text-xs bg-[#1a1a1a] select-none">
      <div className="flex items-center justify-between px-3 h-9 border-b border-[#333333] bg-[#1a1a1a] shrink-0">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#cccccc]">
          <FolderTree className="w-3.5 h-3.5 text-[#d99b26]" />
          <span>Collections</span>
        </div>

        <div className="flex items-center gap-0.5 text-[#888888]">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-1 rounded hover:text-white hover:bg-[#26292b] transition-colors cursor-pointer ${
              showSearch ? 'text-[#d99b26] bg-[#26292b]' : ''
            }`}
            title="Search collections"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCreateCollection}
            className="p-1 rounded hover:text-white hover:bg-[#26292b] transition-colors cursor-pointer"
            title="New collection"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleImport}
            className="p-1 rounded hover:text-white hover:bg-[#26292b] transition-colors cursor-pointer"
            title="Import collection"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {(showSearch || searchQuery) && (
        <div className="px-2 py-1.5 border-b border-[#333333] bg-[#1a1a1a]">
          <div className="relative flex items-center">
            <Search className="w-3 h-3 absolute left-2 text-[#777777] pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search collections..."
              className="w-full bg-[#222224] border border-[#333333] rounded pl-7 pr-6 py-1 text-[11px] text-[#cccccc] placeholder-[#666666] focus:outline-none focus:border-[#444444]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-[#777777] hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-1.5 py-1.5 space-y-0.5 bg-[#1a1a1a]">
        {collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-[#777777] px-4">
            <p className="text-xs font-medium text-[#cccccc]">No collections yet</p>
            <p className="text-[11px] text-[#777777] mt-1 max-w-[200px] leading-relaxed">
              Organize your requests in folders, or import from Postman.
            </p>
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={handleCreateCollection}
                className="px-3 py-1.5 bg-[#d99b26] hover:bg-[#c48b20] text-white rounded font-medium text-xs transition-colors shadow-xs"
              >
                + New Collection
              </button>
              <button
                onClick={handleImport}
                className="px-3 py-1.5 bg-[#26292b] hover:bg-[#2e3235] text-[#cccccc] hover:text-white rounded text-xs transition-colors"
              >
                Import
              </button>
            </div>
          </div>
        ) : (
          collections.map((col) => {
            if (searchQuery.trim() && !collectionMatchesQuery(col, searchQuery)) {
              return null;
            }

            const isColOpen = searchQuery.trim() ? true : (openFolders[col.id] ?? false);
            const isMenuOpen = activeMenu?.id === col.id;
            const totalRequests = countRequestsInTree(col.items);
            const isColEditing = editingId === col.id;

            return (
              <div key={col.id} className="select-none flex flex-col mb-0.5">
                <div
                  className={`group relative flex items-center justify-between py-1 px-1.5 rounded cursor-pointer transition-colors ${
                    isMenuOpen ? 'bg-[#26292b]' : 'hover:bg-[#222224]'
                  }`}
                >
                  <div
                    className="flex items-center gap-1.5 flex-1 min-w-0"
                    onClick={() => !isColEditing && toggleFolder(col.id)}
                  >
                    <button
                      type="button"
                      className="text-[#888888] group-hover:text-[#cccccc] transition-colors p-0.5 cursor-pointer"
                    >
                      {isColOpen ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {isColEditing ? (
                      <InlineRenameInput
                        value={editingName}
                        onChange={setEditingName}
                        onSave={handleSaveRename}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-semibold text-slate-200 text-xs truncate group-hover:text-white">
                          {col.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ({totalRequests})
                        </span>
                      </div>
                    )}
                  </div>

                  {!isColEditing && (
                    <div
                      className={`flex items-center gap-0.5 transition-opacity ${
                        isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddRequestWithExpand(col.id);
                        }}
                        className="p-1 text-[#888888] hover:text-white rounded hover:bg-[#26292b] transition-colors cursor-pointer"
                        title="Add request"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>

                      <button
                        data-menu-id={col.id}
                        onClick={(e) =>
                          openMenuForTarget(e, {
                            id: col.id,
                            type: 'collection',
                            collectionId: col.id,
                            name: col.name,
                            collection: col,
                          })
                        }
                        className={`p-1 rounded transition-colors cursor-pointer ${
                          isMenuOpen
                            ? 'text-white bg-[#26292b]'
                            : 'text-[#888888] hover:text-white hover:bg-[#26292b]'
                        }`}
                        title="More options"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {isColOpen && (
                  <div className="relative flex flex-col space-y-0.5 mt-0.5">
                    <div className="absolute top-0 bottom-0 left-[14px] border-l border-[#333333]" />
                    {col.items.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic py-1 pl-6">
                        No requests. Click + to add one.
                      </p>
                    ) : (
                      col.items.map((item) => renderItem(item, col.id, 1))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <CollectionContextMenu
        activeMenu={activeMenu}
        onClose={() => setActiveMenu(null)}
        onAddRequest={handleAddRequestWithExpand}
        onAddFolder={handleCreateFolder}
        onRunCollection={onRunCollection}
        onStartRename={handleStartRename}
        onExport={handleExport}
        onDuplicateItem={handleDuplicateItem}
        onRequestDeleteCollection={setCollectionToDelete}
        onRequestDeleteItem={setItemToDelete}
      />

      <DeleteConfirmModal
        isOpen={Boolean(collectionToDelete)}
        title="Delete Collection"
        targetName={collectionToDelete?.name || ''}
        subtitle={
          collectionToDelete
            ? `All ${collectionToDelete.items.length} requests and folders within this collection will be permanently removed.`
            : undefined
        }
        confirmLabel="Delete Collection"
        onCancel={() => setCollectionToDelete(null)}
        onConfirm={confirmDeleteCollection}
      />

      <DeleteConfirmModal
        isOpen={Boolean(itemToDelete)}
        title={`Delete ${itemToDelete?.isFolder ? 'Folder' : 'Request'}`}
        targetName={itemToDelete?.itemName || ''}
        confirmLabel="Delete"
        onCancel={() => setItemToDelete(null)}
        onConfirm={confirmDeleteItem}
      />
    </div>
  );
};
