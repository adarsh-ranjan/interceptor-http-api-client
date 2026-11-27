import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Collection, CollectionItem, HttpRequest, Environment } from '../types';
import { getMethodColor } from '../utils/http';
import { exportToPostman, exportToInterceptor, parseCollectionFile } from '../utils/postman';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  MoreHorizontal,
  Play,
  Edit2,
  Trash2,
  Copy,
  Download,
  FileCode,
  Upload,
  FolderPlus,
  AlertTriangle,
  Search,
  X,
  FolderTree,
} from 'lucide-react';

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

interface ActiveMenuState {
  id: string; // collectionId or itemId
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
  environments,
  activeEnvId,
  activeItemId,
}) => {
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Three-dot dropdown menu state
  const [activeMenu, setActiveMenu] = useState<ActiveMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Deletion Modals
  const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{
    collectionId: string;
    itemId: string;
    itemName: string;
    isFolder: boolean;
  } | null>(null);

  // Outside click & escape listener for three-dot menu
  useEffect(() => {
    if (!activeMenu) return;

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // If clicking inside menu itself, let menu action handle it
      if (menuRef.current && menuRef.current.contains(target)) {
        return;
      }
      // If clicking on the trigger button for this menu, let button onClick toggle it
      if (target.closest(`[data-menu-id="${activeMenu.id}"]`)) {
        return;
      }
      setActiveMenu(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenu(null);
      }
    };

    const handleScroll = (e: Event) => {
      // If scrolling inside the dropdown itself, don't close
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }
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

    if (!newName) {
      return;
    }

    const updateItemName = (items: CollectionItem[]): CollectionItem[] => {
      return items.map((item) => {
        if (item.id === targetId) {
          return {
            ...item,
            name: newName,
            request: item.request
              ? { ...item.request, name: newName }
              : undefined,
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
    setActiveMenu(null);
  };

  const handleDuplicateItem = (collectionId: string, itemId: string) => {
    const duplicateInItems = (items: CollectionItem[]): CollectionItem[] => {
      const result: CollectionItem[] = [];
      for (const item of items) {
        result.push(item);
        if (item.id === itemId) {
          const cloneId = `${item.type}-${Date.now()}`;
          const clonedReq = item.request
            ? {
              ...item.request,
              id: `req-${Date.now()}`,
              name: `${item.name} (Copy)`,
            }
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
    setActiveMenu(null);
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

  const countTotalRequests = (items: CollectionItem[]): number => {
    let count = 0;
    for (const item of items) {
      if (item.type === 'request') count++;
      if (item.children) count += countTotalRequests(item.children);
    }
    return count;
  };

  const filterMatches = (text: string) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.trim().toLowerCase());
  };

  const itemOrDescendantMatches = (item: CollectionItem): boolean => {
    if (!searchQuery.trim()) return true;
    if (filterMatches(item.name)) return true;
    if (item.children && item.children.some((child) => itemOrDescendantMatches(child))) {
      return true;
    }
    return false;
  };

  const collectionMatches = (col: Collection): boolean => {
    if (!searchQuery.trim()) return true;
    if (filterMatches(col.name)) return true;
    return col.items.some((item) => itemOrDescendantMatches(item));
  };

  const renderItem = (item: CollectionItem, collectionId: string, level = 1) => {
    if (searchQuery.trim() && !itemOrDescendantMatches(item)) {
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
          {/* Folder Row */}
          <div
            className={`group relative flex items-center justify-between py-1 px-1.5 rounded cursor-pointer transition-colors ${isMenuOpen ? 'bg-[#26292b]' : 'hover:bg-[#222224]'
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
                <div className="flex-1 min-w-0 pr-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={handleSaveRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                    onFocus={(e) => e.target.select()}
                    className="w-full bg-[#1a1a1a] border border-[#d99b26] rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                  />
                </div>
              ) : (
                <span className="truncate text-[#cccccc] font-medium text-xs group-hover:text-white">
                  {item.name}
                </span>
              )}
            </div>

            {/* Row Actions: Hidden while editing */}
            {!isEditing && (
              <div
                className={`flex items-center gap-0.5 transition-opacity ${isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenu(null);
                    onNewRequestInCollection(collectionId, item.id);
                    setOpenFolders((prev) => ({ ...prev, [item.id]: true }));
                  }}
                  className="p-1 text-[#888888] hover:text-white rounded hover:bg-[#26292b] transition-colors cursor-pointer"
                  title="Add request"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>

                <button
                  data-menu-id={item.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeMenu?.id === item.id) {
                      setActiveMenu(null);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setActiveMenu({
                        id: item.id,
                        type: 'folder',
                        collectionId,
                        itemId: item.id,
                        name: item.name,
                        item,
                        anchorRect: rect,
                      });
                    }
                  }}
                  className={`p-1 rounded transition-colors cursor-pointer ${isMenuOpen
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

          {/* Folder Children with hierarchy line */}
          {isOpen && (
            <div className="relative flex flex-col space-y-0.5 mt-0.5">
              {/* Subtle guide line */}
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

    // Request Row
    const req = item.request;
    const methodColor = req ? getMethodColor(req.method) : { bg: '', text: 'text-slate-400', border: '' };
    const isRequestEditing = editingId === item.id;

    return (
      <div
        key={item.id}
        onClick={() => {
          if (isRequestEditing) return;
          setActiveMenu(null);
          req && onSelectRequest(req, collectionId, item.id);
        }}
        style={{ paddingLeft: `${8 + level * 14}px` }}
        className={`group relative flex items-center justify-between py-1 px-1.5 rounded cursor-pointer transition-colors ${isSelected
            ? 'bg-[#222224] text-white font-medium'
            : isMenuOpen
              ? 'bg-[#222224]'
              : 'hover:bg-[#222224] text-[#cccccc]'
          }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {req && (
            <span
              className={`font-mono font-bold text-[10px] shrink-0 text-left ${methodColor.text}`}
            >
              {req.method}
            </span>
          )}
          {isRequestEditing ? (
            <div className="flex-1 min-w-0 pr-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={handleSaveRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename();
                  if (e.key === 'Escape') setEditingId(null);
                }}
                autoFocus
                onFocus={(e) => e.target.select()}
                className="w-full bg-[#1a1a1a] border border-[#d99b26] rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
              />
            </div>
          ) : (
            <span className="truncate text-xs group-hover:text-white">
              {item.name}
            </span>
          )}
        </div>

        {/* Request Row: ONLY Three-dot menu button, hidden while editing */}
        {!isRequestEditing && (
          <div
            className={`flex items-center transition-opacity ${isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
          >
            <button
              data-menu-id={item.id}
              onClick={(e) => {
                e.stopPropagation();
                if (activeMenu?.id === item.id) {
                  setActiveMenu(null);
                } else {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setActiveMenu({
                    id: item.id,
                    type: 'request',
                    collectionId,
                    itemId: item.id,
                    name: item.name,
                    item,
                    anchorRect: rect,
                  });
                }
              }}
              className={`p-1 rounded transition-colors cursor-pointer ${isMenuOpen
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

  // Calculate dropdown menu fixed coordinates
  const renderPortalMenu = () => {
    if (!activeMenu) return null;

    const menuWidth = 196; // w-49
    let left = activeMenu.anchorRect.right - menuWidth;
    if (left < 10) left = 10;
    if (left + menuWidth > window.innerWidth - 10) {
      left = window.innerWidth - menuWidth - 10;
    }

    const estimatedHeight =
      activeMenu.type === 'collection' ? 245 : activeMenu.type === 'folder' ? 145 : 105;

    let top = activeMenu.anchorRect.bottom + 4;
    if (top + estimatedHeight > window.innerHeight - 8) {
      top = Math.max(8, activeMenu.anchorRect.top - estimatedHeight - 4);
    }

    return createPortal(
      <div
        ref={menuRef}
        style={{
          position: 'fixed',
          top: `${top}px`,
          left: `${left}px`,
          zIndex: 9999,
        }}
        className="w-48 bg-[#222224] border border-[#333333] rounded-md shadow-2xl py-1 text-xs select-none backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 text-[#cccccc]"
        onClick={(e) => e.stopPropagation()}
      >
        {activeMenu.type === 'collection' && activeMenu.collection && (
          <>
            <button
              onClick={() => {
                onNewRequestInCollection(activeMenu.collectionId);
                setOpenFolders((prev) => ({ ...prev, [activeMenu.collectionId]: true }));
                setActiveMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-[#d99b26]" />
              <span>Add Request</span>
            </button>
            <button
              onClick={() => handleCreateFolder(activeMenu.collectionId)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5 text-[#d99b26]" />
              <span>Add Folder</span>
            </button>
            <button
              onClick={() => {
                onRunCollection(activeMenu.collection!);
                setActiveMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-emerald-400 hover:bg-[#26292b] text-left transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Collection</span>
            </button>

            <div className="border-t border-[#333333] my-1" />

            <button
              onClick={() => handleStartRename(activeMenu.collectionId, activeMenu.name)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#888888]" />
              <span>Rename</span>
            </button>
            <button
              onClick={() => handleExport(activeMenu.collection!, 'postman')}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#888888]" />
              <span>Export (Postman v2.1)</span>
            </button>
            <button
              onClick={() => handleExport(activeMenu.collection!, 'interceptor')}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors"
            >
              <FileCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export (Interceptor)</span>
            </button>

            <div className="border-t border-[#333333] my-1" />

            <button
              onClick={() => {
                setCollectionToDelete(activeMenu.collection!);
                setActiveMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 text-left font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Collection</span>
            </button>
          </>
        )}

        {activeMenu.type === 'folder' && (
          <>
            <button
              onClick={() => {
                onNewRequestInCollection(activeMenu.collectionId, activeMenu.itemId);
                setOpenFolders((prev) => ({ ...prev, [activeMenu.itemId!]: true }));
                setActiveMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#d99b26]" />
              <span>Add Request</span>
            </button>
            <button
              onClick={() => handleCreateFolder(activeMenu.collectionId, activeMenu.itemId)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5 text-[#d99b26]" />
              <span>Add Subfolder</span>
            </button>

            <div className="border-t border-[#333333] my-1" />

            <button
              onClick={() => handleStartRename(activeMenu.itemId!, activeMenu.name)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#888888]" />
              <span>Rename</span>
            </button>

            <div className="border-t border-[#333333] my-1" />

            <button
              onClick={() => {
                setItemToDelete({
                  collectionId: activeMenu.collectionId,
                  itemId: activeMenu.itemId!,
                  itemName: activeMenu.name,
                  isFolder: true,
                });
                setActiveMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 text-left font-medium transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Folder</span>
            </button>
          </>
        )}

        {activeMenu.type === 'request' && (
          <>
            <button
              onClick={() => handleDuplicateItem(activeMenu.collectionId, activeMenu.itemId!)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-white" />
              <span>Duplicate</span>
            </button>
            <button
              onClick={() => handleStartRename(activeMenu.itemId!, activeMenu.name)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[#cccccc] hover:bg-[#26292b] hover:text-white text-left transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#888888]" />
              <span>Rename</span>
            </button>

            <div className="border-t border-[#333333] my-1" />

            <button
              onClick={() => {
                setItemToDelete({
                  collectionId: activeMenu.collectionId,
                  itemId: activeMenu.itemId!,
                  itemName: activeMenu.name,
                  isFolder: false,
                });
                setActiveMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 text-left font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </>
        )}
      </div>,
      document.body
    );
  };

  return (
    <div className="flex flex-col h-full text-xs bg-[#1a1a1a] select-none">
      {/* Bruno Collections Sidebar Header (matches Image 4) */}
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

      {/* Filter / Search Bar (collapsible or when query exists) */}
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

      {/* Collections Tree List */}
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
            if (searchQuery.trim() && !collectionMatches(col)) {
              return null;
            }

            const isColOpen = searchQuery.trim() ? true : (openFolders[col.id] ?? false);
            const isMenuOpen = activeMenu?.id === col.id;
            const totalRequests = countTotalRequests(col.items);
            const isColEditing = editingId === col.id;

            return (
              <div key={col.id} className="select-none flex flex-col mb-0.5">
                {/* Collection Root Row */}
                <div
                  className={`group relative flex items-center justify-between py-1 px-1.5 rounded cursor-pointer transition-colors ${isMenuOpen ? 'bg-[#26292b]' : 'hover:bg-[#222224]'
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
                      <div className="flex-1 min-w-0 pr-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={handleSaveRename}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename();
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          autoFocus
                          onFocus={(e) => e.target.select()}
                          className="w-full bg-[#1a1a1a] border border-[#d99b26] rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                        />
                      </div>
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

                  {/* Collection Actions: ONLY Add button visible on row + three dots, hidden while editing */}
                  {!isColEditing && (
                    <div
                      className={`flex items-center gap-0.5 transition-opacity ${isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenu(null);
                          onNewRequestInCollection(col.id);
                          setOpenFolders((prev) => ({ ...prev, [col.id]: true }));
                        }}
                        className="p-1 text-[#888888] hover:text-white rounded hover:bg-[#26292b] transition-colors cursor-pointer"
                        title="Add request"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>

                      <button
                        data-menu-id={col.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (activeMenu?.id === col.id) {
                            setActiveMenu(null);
                          } else {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setActiveMenu({
                              id: col.id,
                              type: 'collection',
                              collectionId: col.id,
                              name: col.name,
                              collection: col,
                              anchorRect: rect,
                            });
                          }
                        }}
                        className={`p-1 rounded transition-colors cursor-pointer ${isMenuOpen
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

                {/* Collection Children with tree guide */}
                {isColOpen && (
                  <div className="relative flex flex-col space-y-0.5 mt-0.5">
                    {/* Subtle hierarchy guide line */}
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

      {/* Portal Menu for Three-dot Dropdown */}
      {renderPortalMenu()}

      {/* Delete Collection Confirmation Modal */}
      {collectionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-[#222224] border border-[#333333] rounded-lg shadow-2xl p-4 text-xs">
            <div className="flex items-center gap-2 text-rose-400 font-semibold mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Delete Collection</span>
            </div>
            <p className="text-[#cccccc] leading-relaxed">
              Are you sure you want to delete <strong className="text-white">"{collectionToDelete.name}"</strong>?
            </p>
            <p className="text-[#888888] text-[11px] mt-1">
              All {collectionToDelete.items.length} requests and folders within this collection will be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[#333333]">
              <button
                type="button"
                onClick={() => setCollectionToDelete(null)}
                className="px-3 py-1.5 rounded text-[#888888] hover:text-white hover:bg-[#26292b] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteCollection}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-sm transition-colors cursor-pointer"
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
          <div className="w-full max-w-sm bg-[#222224] border border-[#333333] rounded-lg shadow-2xl p-4 text-xs">
            <div className="flex items-center gap-2 text-rose-400 font-semibold mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Delete {itemToDelete.isFolder ? 'Folder' : 'Request'}</span>
            </div>
            <p className="text-[#cccccc] leading-relaxed">
              Are you sure you want to delete <strong className="text-white">"{itemToDelete.itemName}"</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[#333333]">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-3 py-1.5 rounded text-[#888888] hover:text-white hover:bg-[#26292b] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteItem}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-sm transition-colors cursor-pointer"
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
