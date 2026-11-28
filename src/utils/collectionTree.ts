import { Collection, CollectionItem, HttpRequest } from '../types';

/**
 * Recursively updates a request item in a collection item tree.
 */
export function updateRequestItemInTree(
  items: CollectionItem[],
  itemId: string,
  request: HttpRequest
): CollectionItem[] {
  return items.map((item) => {
    if (item.id === itemId) {
      return {
        ...item,
        name: request.name || item.name,
        request: { ...request },
      };
    }
    if (item.children) {
      return { ...item, children: updateRequestItemInTree(item.children, itemId, request) };
    }
    return item;
  });
}

/**
 * Recursively adds a new item to a target folder, or appends to root if folderId is omitted.
 */
export function addItemToTree(
  items: CollectionItem[],
  newItem: CollectionItem,
  folderId?: string
): CollectionItem[] {
  if (!folderId) {
    return [...items, newItem];
  }
  return items.map((item) => {
    if (item.id === folderId && item.type === 'folder') {
      return {
        ...item,
        children: [...(item.children || []), newItem],
      };
    }
    if (item.children) {
      return { ...item, children: addItemToTree(item.children, newItem, folderId) };
    }
    return item;
  });
}

/**
 * Recursively renames an item (folder or request) in a collection tree.
 */
export function renameItemInTree(
  items: CollectionItem[],
  targetId: string,
  newName: string
): CollectionItem[] {
  return items.map((item) => {
    if (item.id === targetId) {
      return {
        ...item,
        name: newName,
        request: item.request ? { ...item.request, name: newName } : undefined,
      };
    }
    if (item.children) {
      return { ...item, children: renameItemInTree(item.children, targetId, newName) };
    }
    return item;
  });
}

/**
 * Recursively removes an item from a collection tree.
 */
export function removeItemFromTree(items: CollectionItem[], itemId: string): CollectionItem[] {
  return items
    .filter((item) => item.id !== itemId)
    .map((item) => (item.children ? { ...item, children: removeItemFromTree(item.children, itemId) } : item));
}

/**
 * Recursively duplicates an item immediately after itself in the tree.
 */
export function duplicateItemInTree(items: CollectionItem[], itemId: string): CollectionItem[] {
  const result: CollectionItem[] = [];
  for (const item of items) {
    if (item.id === itemId) {
      result.push(item);
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
      result.push({
        ...item,
        children: duplicateItemInTree(item.children, itemId),
      });
    } else {
      result.push(item);
    }
  }
  return result;
}

/**
 * Counts total request items recursively within a collection tree.
 */
export function countRequestsInTree(items: CollectionItem[]): number {
  let count = 0;
  for (const item of items) {
    if (item.type === 'request') count++;
    if (item.children) count += countRequestsInTree(item.children);
  }
  return count;
}

/**
 * Flattens all request items in a collection tree in depth-first order.
 */
export function flattenCollectionRequests(
  items: CollectionItem[]
): { name: string; request: HttpRequest }[] {
  const result: { name: string; request: HttpRequest }[] = [];
  for (const item of items) {
    if (item.type === 'request' && item.request) {
      result.push({ name: item.name, request: item.request });
    } else if (item.type === 'folder' && item.children) {
      result.push(...flattenCollectionRequests(item.children));
    }
  }
  return result;
}

function textMatchesQuery(text: string, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;
  return text.toLowerCase().includes(trimmed.toLowerCase());
}

/**
 * Checks if an item or any of its descendants match a search query.
 */
export function itemOrDescendantMatches(item: CollectionItem, query: string): boolean {
  if (!query.trim()) return true;
  if (textMatchesQuery(item.name, query)) return true;
  return Boolean(item.children?.some((child) => itemOrDescendantMatches(child, query)));
}

/**
 * Checks if a collection name or any of its items match a search query.
 */
export function collectionMatchesQuery(collection: Collection, query: string): boolean {
  if (!query.trim()) return true;
  if (textMatchesQuery(collection.name, query)) return true;
  return collection.items.some((item) => itemOrDescendantMatches(item, query));
}

/**
 * Finds the collection containing a given request or item ID.
 */
export function findCollectionForRequest(
  collections: Collection[],
  requestId?: string,
  itemId?: string
): Collection | undefined {
  const containsItem = (items: CollectionItem[]): boolean =>
    items.some((item) => {
      if (item.type === 'request') {
        return item.request?.id === requestId || item.id === itemId;
      }
      return item.children ? containsItem(item.children) : false;
    });

  return collections.find((col) => containsItem(col.items)) || collections[0];
}
