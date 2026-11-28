import React from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import {
  MoreHorizontal,
  Plus,
  FolderPlus,
  Play,
  Edit2,
  Trash2,
  Copy,
  Download,
  FileCode,
} from 'lucide-react';

interface CollectionActionMenuProps {
  type: 'collection' | 'folder' | 'request';
  onAddRequest?: () => void;
  onAddFolder?: () => void;
  onRun?: () => void;
  onRename?: () => void;
  onDuplicate?: () => void;
  onExportPostman?: () => void;
  onExportInterceptor?: () => void;
  onDelete: () => void;
}

export const CollectionActionMenu: React.FC<CollectionActionMenuProps> = ({
  type,
  onAddRequest,
  onAddFolder,
  onRun,
  onRename,
  onDuplicate,
  onExportPostman,
  onExportInterceptor,
  onDelete,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground h-5 w-5"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
          <span className="sr-only">Menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
        {type === 'collection' && (
          <>
            {onRun && (
              <DropdownMenuItem onClick={onRun}>
                <Play className="w-3.5 h-3.5 text-primary" />
                <span>Run Collection</span>
              </DropdownMenuItem>
            )}
            {onAddRequest && (
              <DropdownMenuItem onClick={onAddRequest}>
                <Plus className="w-3.5 h-3.5" />
                <span>Add Request</span>
              </DropdownMenuItem>
            )}
            {onAddFolder && (
              <DropdownMenuItem onClick={onAddFolder}>
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Add Folder</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {onExportPostman && (
              <DropdownMenuItem onClick={onExportPostman}>
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export Postman v2.1</span>
              </DropdownMenuItem>
            )}
            {onExportInterceptor && (
              <DropdownMenuItem onClick={onExportInterceptor}>
                <FileCode className="w-3.5 h-3.5 text-sky-400" />
                <span>Export Interceptor</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
          </>
        )}

        {type === 'folder' && (
          <>
            {onAddRequest && (
              <DropdownMenuItem onClick={onAddRequest}>
                <Plus className="w-3.5 h-3.5" />
                <span>Add Request</span>
              </DropdownMenuItem>
            )}
            {onAddFolder && (
              <DropdownMenuItem onClick={onAddFolder}>
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Add Subfolder</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
          </>
        )}

        {type === 'request' && onDuplicate && (
          <>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate Request</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {onRename && (
          <DropdownMenuItem onClick={onRename}>
            <Edit2 className="w-3.5 h-3.5" />
            <span>Rename</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
