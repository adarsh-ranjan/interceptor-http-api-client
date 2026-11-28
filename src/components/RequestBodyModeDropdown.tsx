import React from 'react';
import { BodyType } from '../types';
import {
  ChevronDown,
  Braces,
  FileText,
  Files,
  AlignLeft,
  FileUp,
  X,
  Check,
} from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface RequestBodyModeDropdownProps {
  bodyMode: BodyType;
  onModeChange: (mode: BodyType) => void;
  onPrettify?: () => void;
}

export function humanizeRequestBodyMode(mode: BodyType): string {
  switch (mode) {
    case 'none':
      return 'No Body';
    case 'json':
      return 'JSON';
    case 'form-data':
      return 'Multipart Form';
    case 'urlencoded':
      return 'Form URL Encoded';
    case 'text':
      return 'TEXT';
    case 'binary':
      return 'File / Binary';
    default:
      return 'No Body';
  }
}

interface ModeOption {
  id: BodyType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MODE_GROUPS: { name: string; options: ModeOption[] }[] = [
  {
    name: 'FORM',
    options: [
      { id: 'form-data', label: 'Multipart Form', icon: Files },
      { id: 'urlencoded', label: 'Form URL Encoded', icon: AlignLeft },
    ],
  },
  {
    name: 'RAW',
    options: [
      { id: 'json', label: 'JSON', icon: Braces },
      { id: 'text', label: 'TEXT', icon: FileText },
    ],
  },
  {
    name: 'OTHER',
    options: [
      { id: 'binary', label: 'File / Binary', icon: FileUp },
      { id: 'none', label: 'No Body', icon: X },
    ],
  },
];

export const RequestBodyModeDropdown: React.FC<RequestBodyModeDropdownProps> = ({
  bodyMode,
  onModeChange,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs font-normal gap-1.5 bg-background border-border text-foreground hover:bg-muted"
        >
          <span>{humanizeRequestBodyMode(bodyMode)}</span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {MODE_GROUPS.map((group, groupIdx) => (
          <React.Fragment key={group.name}>
            {groupIdx > 0 && <DropdownMenuSeparator />}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[10px] text-muted-foreground font-semibold px-2 py-1">
                {group.name}
              </DropdownMenuLabel>
              {group.options.map((opt) => {
                const Icon = opt.icon;
                const isSelected = bodyMode === opt.id;
                return (
                  <DropdownMenuItem
                    key={opt.id}
                    onClick={() => onModeChange(opt.id)}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{opt.label}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-500" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
