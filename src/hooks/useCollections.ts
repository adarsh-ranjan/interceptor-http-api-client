import { useCallback, useState } from 'react';
import { DEFAULT_REQUEST, INITIAL_COLLECTIONS, STORAGE_KEYS } from '../constants/defaults';
import { Collection, CollectionItem, HttpRequest } from '../types';
import {
  addItemToTree,
  duplicateItemInTree,
  removeItemFromTree,
  renameItemInTree,
  updateRequestItemInTree,
} from '../utils/collectionTree';
import { getStorageJson, setStorageJson } from '../utils/storage';

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>(() =>
    getStorageJson<Collection[]>(STORAGE_KEYS.COLLECTIONS, INITIAL_COLLECTIONS)
  );

  const updateCollections = useCallback((newCols: Collection[]) => {
    setCollections(newCols);
    setStorageJson(STORAGE_KEYS.COLLECTIONS, newCols);
  }, []);

  const saveExistingRequest = useCallback(
    (request: HttpRequest) => {
      if (!request.collectionId || !request.itemId) return false;
      const { collectionId, itemId } = request;

      const updatedCols = collections.map((col) =>
        col.id === collectionId
          ? {
              ...col,
              items: updateRequestItemInTree(col.items, itemId, request),
              updatedAt: Date.now(),
            }
          : col
      );

      updateCollections(updatedCols);
      return true;
    },
    [collections, updateCollections]
  );

  const saveNewRequest = useCallback(
    (
      baseRequest: HttpRequest,
      options: {
        name: string;
        collectionId: string;
        folderId?: string;
        newCollectionName?: string;
      }
    ): HttpRequest => {
      const newItemId = `item-${Date.now()}`;
      let targetCollectionId = options.collectionId;
      let nextCollections = [...collections];

      if (options.collectionId === 'new') {
        const newCol: Collection = {
          id: `col-${Date.now()}`,
          name: options.newCollectionName || 'New Collection',
          items: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        targetCollectionId = newCol.id;
        nextCollections.push(newCol);
      }

      const savedRequest: HttpRequest = {
        ...baseRequest,
        name: options.name,
        collectionId: targetCollectionId,
        itemId: newItemId,
      };

      const newCollectionItem: CollectionItem = {
        id: newItemId,
        name: options.name,
        type: 'request',
        request: savedRequest,
      };

      nextCollections = nextCollections.map((col) =>
        col.id === targetCollectionId
          ? {
              ...col,
              items: addItemToTree(col.items, newCollectionItem, options.folderId),
              updatedAt: Date.now(),
            }
          : col
      );

      updateCollections(nextCollections);
      return savedRequest;
    },
    [collections, updateCollections]
  );

  const createRequestInCollection = useCallback(
    (collectionId: string, folderId?: string): HttpRequest => {
      const newItemId = `item-${Date.now()}`;
      const newReq: HttpRequest = {
        ...DEFAULT_REQUEST,
        id: `req-${Date.now()}`,
        name: 'New Request',
        collectionId,
        itemId: newItemId,
      };

      const newCollectionItem: CollectionItem = {
        id: newItemId,
        name: 'New Request',
        type: 'request',
        request: newReq,
      };

      const updated = collections.map((col) =>
        col.id === collectionId
          ? {
              ...col,
              items: addItemToTree(col.items, newCollectionItem, folderId),
              updatedAt: Date.now(),
            }
          : col
      );

      updateCollections(updated);
      return newReq;
    },
    [collections, updateCollections]
  );

  const createCollection = useCallback((): Collection => {
    const newCol: Collection = {
      id: `col-${Date.now()}`,
      name: `New Collection ${collections.length + 1}`,
      items: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    updateCollections([...collections, newCol]);
    return newCol;
  }, [collections, updateCollections]);

  const createFolder = useCallback(
    (collectionId: string, parentFolderId?: string): CollectionItem => {
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
      updateCollections(updated);
      return newFolder;
    },
    [collections, updateCollections]
  );

  const renameNode = useCallback(
    (targetId: string, newName: string) => {
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
      updateCollections(updated);
    },
    [collections, updateCollections]
  );

  const duplicateItem = useCallback(
    (collectionId: string, itemId: string) => {
      const updated = collections.map((col) =>
        col.id === collectionId
          ? {
              ...col,
              items: duplicateItemInTree(col.items, itemId),
              updatedAt: Date.now(),
            }
          : col
      );
      updateCollections(updated);
    },
    [collections, updateCollections]
  );

  const deleteCollection = useCallback(
    (collectionId: string) => {
      updateCollections(collections.filter((c) => c.id !== collectionId));
    },
    [collections, updateCollections]
  );

  const deleteItem = useCallback(
    (collectionId: string, itemId: string) => {
      const updated = collections.map((col) =>
        col.id === collectionId
          ? {
              ...col,
              items: removeItemFromTree(col.items, itemId),
              updatedAt: Date.now(),
            }
          : col
      );
      updateCollections(updated);
    },
    [collections, updateCollections]
  );

  return {
    collections,
    updateCollections,
    saveExistingRequest,
    saveNewRequest,
    createRequestInCollection,
    createCollection,
    createFolder,
    renameNode,
    duplicateItem,
    deleteCollection,
    deleteItem,
  };
}
