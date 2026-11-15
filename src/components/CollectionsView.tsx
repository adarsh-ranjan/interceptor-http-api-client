import React, { useState } from 'react';
import { Collection, CollectionItem, HttpRequest } from '../types';
import { getMethodColor } from '../utils/http';
import { exportToPostman, exportToInterceptor, parseCollectionFile } from '../utils/postman';
import {
  Folder,
  FolderOpen,
  FolderPlus,
  Plus,
  Trash2,
  Download,
  Upload,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  FileCode,
  Edit2,
  Check,
  Play,
  AlertTriangle,
} from 'lucide-react';

interface CollectionsViewProps {
  collections: Collection[];
  onSelectRequest: (req: HttpRequest, collectionId?: string, itemId?: string) => void;
  onUpdateCollections: (collections: Collection[]) => void;
  onNewRequestInCollection: (collectionId: string, folderId?: string) => void;
  onRunCollection: (collection: Collection) => void;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  collections,
  onSelectRequest,
  onUpdateCollections,
  onNewRequestInCollection,
  onRunCollection,
}) => {
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ collectionId: string; itemId: string; itemName: string; isFolder: boolean } | null>(null);

  const toggleFolder = (id: string) => {
    setOpenFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
    setActiveMenuId(null);
  };

  const handleSaveRename = () => {
    if (!editingId || !editingName.trim()) {
      setEditingId(null);
      return;
    }

    const updateItemName = (items: CollectionItem[]): CollectionItem[] => {
      return items.map((item) => {
        if (item.id === editingId) {
          return { ...item, name: editingName.trim() };
        }
        if (item.children) {
          return { ...item, children: updateItemName(item.children) };
        }
        return item;
      });
    };

    const updated = collections.map((col) => {
      if (col.id === editingId) {
        return { ...col, name: editingName.trim(), updatedAt: Date.now() };
      }
      return { ...col, items: updateItemName(col.items), updatedAt: Date.now() };
    });

    onUpdateCollections(updated);
    setEditingId(null);
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

  const handleCreateFolder = (collectionId: string) => {
    const updated = collections.map((col) => {
      if (col.id === collectionId) {
        const newFolder: CollectionItem = {
          id: `folder-${Date.now()}`,
          name: 'New Folder',
          type: 'folder',
          children: [],
        };
        return { ...col, items: [...col.items, newFolder], updatedAt: Date.now() };
      }
      return col;
    });
    onUpdateCollections(updated);
    setOpenFolders((prev) => ({ ...prev, [collectionId]: true }));
  };

  const confirmDeleteCollection = () => {
    if (!collectionToDelete) return;
    onUpdateCollections(collections.filter((c) => c.id !== collectionToDelete.id));
    setCollectionToDelete(null);
    setActiveMenuId(null);
  };

  const confirmDeleteItem = () => {
    if (!itemToDelete) return;
    const { collectionId, itemId } = itemToDelete;

    const removeItem = (items: CollectionItem[]): CollectionItem[] => {
      return items
        .filter((item) => item.id !== itemId)
        .map((item) => (item.children ? { ...item, children: removeItem(item.children) } : item));
    };

    const updated = collections.map((col) => {
      if (col.id === collectionId) {
        return { ...col, items: removeItem(col.items), updatedAt: Date.now() };
      }
      return col;
    });
    onUpdateCollections(updated);
    setItemToDelete(null);
  };

  const handleExport = async (col: Collection, format: 'postman' | 'interceptor') => {
    const content = format === 'postman' ? exportToPostman(col) : exportToInterceptor(col);
    const fileName = `${col.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${format}.json`;

    if (window.interceptor?.saveFileDialog) {
      await window.interceptor.saveFileDialog({
        defaultPath: fileName,
        content,
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
      });
    } else {
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
    setActiveMenuId(null);
  };

  const handleImport = async () => {
    try {
      let content = '';
      if (window.interceptor?.openFileDialog) {
        const res = await window.interceptor.openFileDialog({
          filters: [{ name: 'Collection JSON', extensions: ['json'] }],
        });
        if (res.canceled || !res.content) return;
        content = res.content;
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e: any) => {
          const file = e.target.files[0];
          if (!file) return;
          const text = await file.text();
          const parsed = parseCollectionFile(text);
          onUpdateCollections([...collections, parsed]);
          setOpenFolders((prev) => ({ ...prev, [parsed.id]: true }));
        };
        input.click();
        return;
      }

      const parsed = parseCollectionFile(content);
      onUpdateCollections([...collections, parsed]);
      setOpenFolders((prev) => ({ ...prev, [parsed.id]: true }));
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    }
  };

  const renderItem = (item: CollectionItem, collectionId: string, level = 0) => {
    const isFolder = item.type === 'folder';
    const isOpen = openFolders[item.id] ?? false;

    if (isFolder) {
      return (
        <div key={item.id} className="select-none" style={{ paddingLeft: `${level * 10}px` }}>
          <div className="flex items-center justify-between p-1.5 rounded hover:bg-[#21262d] group cursor-pointer">
            <div
              className="flex items-center gap-1.5 flex-1 min-w-0"
              onClick={() => toggleFolder(item.id)}
            >
              <button type="button" className="text-slate-500 hover:text-slate-300">
                {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {isOpen ? (
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-amber-400" />
              )}
              {editingId === item.id ? (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
                    autoFocus
                    className="bg-[#0d1117] border border-sky-500 rounded px-1.5 py-0.5 text-xs text-white"
                  />
                  <button onClick={handleSaveRename} className="text-emerald-400">
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <span className="truncate text-slate-300 font-medium text-xs">{item.name}</span>
              )}
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNewRequestInCollection(collectionId, item.id);
                  setOpenFolders((prev) => ({ ...prev, [item.id]: true }));
                }}
                className="p-1 text-slate-400 hover:text-sky-400 rounded hover:bg-[#161b22]"
                title="Add request to folder"
              >
                <Plus className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartRename(item.id, item.name);
                }}
                className="p-1 text-slate-400 hover:text-sky-400 rounded hover:bg-[#161b22]"
                title="Rename folder"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setItemToDelete({
                    collectionId,
                    itemId: item.id,
                    itemName: item.name,
                    isFolder: true,
                  });
                }}
                className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-[#161b22]"
                title="Delete folder"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {isOpen && (
            <div className="space-y-0.5">
              {item.children && item.children.length > 0 ? (
                item.children.map((child) => renderItem(child, collectionId, level + 1))
              ) : (
                <p
                  className="text-[10px] text-slate-500 italic py-1"
                  style={{ paddingLeft: `${(level + 1) * 12}px` }}
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
    const methodColor = req ? getMethodColor(req.method) : { bg: '', text: 'text-slate-400', border: '' };

    return (
      <div
        key={item.id}
        onClick={() => req && onSelectRequest(req, collectionId, item.id)}
        style={{ paddingLeft: `${level * 10}px` }}
        className="flex items-center justify-between p-1.5 rounded hover:bg-[#21262d] group cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {req && (
            <span
              className={`font-mono font-bold text-[9px] px-1 py-0.2 rounded border ${methodColor.bg} ${methodColor.text} ${methodColor.border}`}
            >
              {req.method}
            </span>
          )}
          {editingId === item.id ? (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
                autoFocus
                className="bg-[#0d1117] border border-sky-500 rounded px-1.5 py-0.5 text-xs text-white"
              />
              <button onClick={handleSaveRename} className="text-emerald-400">
                <Check className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <span className="truncate text-slate-300 font-sans text-xs group-hover:text-white">
              {item.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleStartRename(item.id, item.name);
            }}
            className="p-1 text-slate-400 hover:text-sky-400 rounded hover:bg-[#161b22]"
            title="Rename"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setItemToDelete({
                collectionId,
                itemId: item.id,
                itemName: item.name,
                isFolder: false,
              });
            }}
            className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-[#161b22]"
            title="Delete request"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full text-xs">
      {/* Action Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#30363d]/50 bg-[#161b22]">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Collections ({collections.length})
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleImport}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-sky-400 px-2 py-1 rounded hover:bg-[#21262d] transition-colors"
            title="Import Postman or Interceptor collection"
          >
            <Upload className="w-3 h-3" />
            <span>Import</span>
          </button>
          <button
            onClick={handleCreateCollection}
            className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 px-2 py-1 rounded hover:bg-sky-500/10 font-medium transition-colors"
            title="New Collection"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>
      </div>

      {/* Collections List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-slate-500 px-4">
            <Folder className="w-8 h-8 text-slate-600 mb-2 stroke-[1.5]" />
            <p className="text-xs font-medium text-slate-400">No collections yet</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Organize your API requests in folders or import from Postman.
            </p>
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={handleCreateCollection}
                className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium transition-colors"
              >
                + New Collection
              </button>
              <button
                onClick={handleImport}
                className="px-3 py-1 bg-[#21262d] hover:bg-[#30363d] text-slate-300 rounded transition-colors"
              >
                Import Postman
              </button>
            </div>
          </div>
        ) : (
          collections.map((col) => {
            const isColOpen = openFolders[col.id] ?? false;

            return (
              <div key={col.id} className="rounded border border-[#30363d]/40 bg-[#161b22]/30 relative">
                {/* Collection Root Bar */}
                <div className="flex items-center justify-between p-2 bg-[#161b22] hover:bg-[#21262d]/70 group cursor-pointer transition-colors rounded-t">
                  <div
                    className="flex items-center gap-2 flex-1 min-w-0"
                    onClick={() => toggleFolder(col.id)}
                  >
                    <button type="button" className="text-slate-400 hover:text-white">
                      {isColOpen ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <Folder className="w-4 h-4 text-sky-400" />
                    {editingId === col.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
                          autoFocus
                          className="bg-[#0d1117] border border-sky-500 rounded px-1.5 py-0.5 text-xs text-white"
                        />
                        <button onClick={handleSaveRename} className="text-emerald-400">
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="font-semibold text-slate-200 truncate">{col.name}</span>
                    )}
                    <span className="text-[10px] text-slate-500 font-mono">({col.items.length})</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRunCollection(col);
                      }}
                      className="p-1 text-slate-400 hover:text-emerald-400 rounded hover:bg-[#0d1117] transition-colors"
                      title="Run Collection"
                    >
                      <Play className="w-3 h-3 fill-current text-emerald-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNewRequestInCollection(col.id);
                        setOpenFolders((prev) => ({ ...prev, [col.id]: true }));
                      }}
                      className="p-1 text-slate-400 hover:text-sky-400 rounded hover:bg-[#0d1117] transition-colors"
                      title="Add request"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateFolder(col.id);
                      }}
                      className="p-1 text-slate-400 hover:text-amber-400 rounded hover:bg-[#0d1117] transition-colors"
                      title="Add folder"
                    >
                      <FolderPlus className="w-3 h-3" />
                    </button>

                    {/* Direct visible Delete Collection Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCollectionToDelete(col);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-[#0d1117] transition-colors"
                      title="Delete Collection"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>

                    {/* Overflow menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === col.id ? null : col.id);
                        }}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-[#0d1117] transition-colors"
                      >
                        <MoreVertical className="w-3 h-3" />
                      </button>

                      {activeMenuId === col.id && (
                        <div
                          className="absolute right-0 top-full mt-1 w-44 bg-[#161b22] border border-[#30363d] rounded-md shadow-2xl z-30 py-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              onRunCollection(col);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-emerald-400 hover:bg-[#21262d] text-left"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Run Collection</span>
                          </button>
                          <button
                            onClick={() => handleStartRename(col.id, col.name)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-300 hover:bg-[#21262d] text-left"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Rename</span>
                          </button>
                          <button
                            onClick={() => handleExport(col, 'postman')}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-300 hover:bg-[#21262d] text-left"
                          >
                            <Download className="w-3 h-3 text-sky-400" />
                            <span>Export (Postman v2.1)</span>
                          </button>
                          <button
                            onClick={() => handleExport(col, 'interceptor')}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-300 hover:bg-[#21262d] text-left"
                          >
                            <FileCode className="w-3 h-3 text-emerald-400" />
                            <span>Export (Interceptor JSON)</span>
                          </button>
                          <div className="border-t border-[#30363d] my-1" />
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              setCollectionToDelete(col);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-400 hover:bg-rose-500/10 text-left font-medium"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete Collection</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Collection Items */}
                {isColOpen && (
                  <div className="p-1 space-y-0.5 bg-[#0d1117]/40 border-t border-[#30363d]/30">
                    {col.items.length === 0 ? (
                      <p className="text-[10px] text-slate-500 italic p-2 text-center">
                        No requests yet. Click + to add one.
                      </p>
                    ) : (
                      col.items.map((item) => renderItem(item, col.id, 0))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Delete Collection Confirmation Modal */}
      {collectionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl p-4 text-xs">
            <div className="flex items-center gap-2 text-rose-400 font-semibold mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Delete Collection</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Are you sure you want to delete <strong className="text-white">"{collectionToDelete.name}"</strong>?
            </p>
            <p className="text-slate-400 text-[11px] mt-1">
              All {collectionToDelete.items.length} requests and folders within this collection will be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[#30363d]">
              <button
                type="button"
                onClick={() => setCollectionToDelete(null)}
                className="px-3 py-1.5 rounded text-slate-400 hover:text-white hover:bg-[#21262d] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteCollection}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-sm transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Collection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Item (Request/Folder) Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl p-4 text-xs">
            <div className="flex items-center gap-2 text-rose-400 font-semibold mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Delete {itemToDelete.isFolder ? 'Folder' : 'Request'}</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Are you sure you want to delete <strong className="text-white">"{itemToDelete.itemName}"</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[#30363d]">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-3 py-1.5 rounded text-slate-400 hover:text-white hover:bg-[#21262d] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteItem}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-sm transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
