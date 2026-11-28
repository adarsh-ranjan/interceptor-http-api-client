import React, { useState } from 'react';
import { KeyValuePair, Environment } from '../types';
import { Trash2, HelpCircle } from 'lucide-react';
import { VariableInput } from './VariableInput';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

interface KeyValueEditorProps {
  items: KeyValuePair[];
  onChange: (items: KeyValuePair[]) => void;
  title?: string;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  descriptionPlaceholder?: string;
  activeEnvironment?: Environment;
  environments?: Environment[];
  onOpenEnvironmentModal?: () => void;
  showPathParams?: boolean;
}

export const KeyValueEditor: React.FC<KeyValueEditorProps> = ({
  items,
  onChange,
  title = 'Query',
  keyPlaceholder = 'Name',
  valuePlaceholder = 'Value',
  descriptionPlaceholder = 'Description',
  activeEnvironment,
  environments,
  onOpenEnvironmentModal,
  showPathParams = true,
}) => {
  const [isBulkEdit, setIsBulkEdit] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const handleUpdate = (id: string, field: keyof KeyValuePair, value: any) => {
    const updated = items.map((item) => (item.id === id ? { ...item, [field]: value } : item));
    onChange(updated);
  };

  const handleDelete = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const handleToggle = (id: string) => {
    const updated = items.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item));
    onChange(updated);
  };

  const handleToggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    onChange(items.map((i) => ({ ...i, enabled: checked })));
  };

  const handleAddNewRow = (field: 'key' | 'value' | 'description', val: string) => {
    if (!val.trim() && field === 'key') return;
    const newItem: KeyValuePair = {
      id: Math.random().toString(36).substring(2, 9),
      key: field === 'key' ? val : '',
      value: field === 'value' ? val : '',
      description: field === 'description' ? val : '',
      enabled: true,
    };
    onChange([...items, newItem]);
  };

  const handleStartBulkEdit = () => {
    const text = items
      .map((item) => `${item.key || ''}:${item.value || ''}`)
      .join('\n');
    setBulkText(text);
    setIsBulkEdit(true);
  };

  const handleSaveBulkEdit = () => {
    const lines = bulkText.split('\n');
    const newItems: KeyValuePair[] = lines
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const colonIndex = line.indexOf(':');
        const key = colonIndex !== -1 ? line.slice(0, colonIndex).trim() : line.trim();
        const value = colonIndex !== -1 ? line.slice(colonIndex + 1).trim() : '';
        return {
          id: Math.random().toString(36).substring(2, 9),
          key,
          value,
          enabled: true,
          description: '',
        };
      });
    onChange(newItems);
    setIsBulkEdit(false);
  };

  const allChecked = items.length > 0 && items.every((i) => i.enabled);
  const someChecked = items.some((i) => i.enabled);

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 py-3 select-none text-xs">
      {/* Section Title */}
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold text-xs text-muted-foreground">{title}</span>
      </div>

      {isBulkEdit ? (
        <div className="flex flex-col gap-2">
          <Textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder="key:value"
            className="w-full h-40 bg-card border-border font-mono text-xs text-foreground resize-none"
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsBulkEdit(false)}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="amber"
              size="sm"
              onClick={handleSaveBulkEdit}
              className="text-xs"
            >
              Apply
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="border border-border rounded-md overflow-clip bg-card">
            <table className="w-full border-collapse table-fixed text-xs">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground select-none h-8">
                  <td className="w-8 text-center border-b border-r border-border p-0">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={(el) => {
                        if (el) el.indeterminate = !allChecked && someChecked;
                      }}
                      onChange={handleToggleAll}
                      className="cursor-pointer accent-amber-500"
                    />
                  </td>
                  <td className="w-[32%] px-2.5 py-1.5 border-b border-r border-border font-normal text-muted-foreground">
                    {keyPlaceholder}
                  </td>
                  <td className="w-[35%] px-2.5 py-1.5 border-b border-r border-border font-normal text-muted-foreground">
                    {valuePlaceholder}
                  </td>
                  <td className="px-2.5 py-1.5 border-b border-r border-border font-normal text-muted-foreground">
                    {descriptionPlaceholder}
                  </td>
                  <td className="w-8 border-b border-border p-0"></td>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="h-8 hover:bg-muted/40 transition-colors group"
                  >
                    <td className="w-8 text-center border-b border-r border-border p-0">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={() => handleToggle(item.id)}
                        className="cursor-pointer accent-amber-500"
                      />
                    </td>
                    <td className="border-b border-r border-border p-0">
                      <VariableInput
                        value={item.key}
                        onChange={(val) => handleUpdate(item.id, 'key', val)}
                        placeholder="Name"
                        activeEnvironment={activeEnvironment}
                        environments={environments}
                        onOpenEnvironmentModal={onOpenEnvironmentModal}
                        wrapperClassName="border-0 bg-transparent rounded-none focus-within:border-0"
                      />
                    </td>
                    <td className="border-b border-r border-border p-0">
                      <VariableInput
                        value={item.value}
                        onChange={(val) => handleUpdate(item.id, 'value', val)}
                        placeholder="Value"
                        activeEnvironment={activeEnvironment}
                        environments={environments}
                        onOpenEnvironmentModal={onOpenEnvironmentModal}
                        wrapperClassName="border-0 bg-transparent rounded-none focus-within:border-0"
                      />
                    </td>
                    <td className="border-b border-r border-border p-0">
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) => handleUpdate(item.id, 'description', e.target.value)}
                        placeholder="Description"
                        className="w-full bg-transparent px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none"
                      />
                    </td>
                    <td className="w-8 text-center border-b border-border p-0">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(item.id)}
                        className="p-1 h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}

                {/* Inline Add Row */}
                <tr className="h-8 hover:bg-muted/30 transition-colors">
                  <td className="w-8 text-center border-b border-r border-border p-0 opacity-40">
                    <input type="checkbox" disabled className="accent-amber-500" />
                  </td>
                  <td className="border-b border-r border-border p-0">
                    <input
                      type="text"
                      placeholder="Name"
                      onBlur={(e) => {
                        if (e.target.value.trim()) {
                          handleAddNewRow('key', e.target.value);
                          e.target.value = '';
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          handleAddNewRow('key', e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                      className="w-full bg-transparent px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none font-mono"
                    />
                  </td>
                  <td className="border-b border-r border-border p-0">
                    <input
                      type="text"
                      placeholder="Value"
                      onBlur={(e) => {
                        if (e.target.value.trim()) {
                          handleAddNewRow('value', e.target.value);
                          e.target.value = '';
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          handleAddNewRow('value', e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                      className="w-full bg-transparent px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none font-mono"
                    />
                  </td>
                  <td className="border-b border-r border-border p-0">
                    <input
                      type="text"
                      placeholder="Description"
                      onBlur={(e) => {
                        if (e.target.value.trim()) {
                          handleAddNewRow('description', e.target.value);
                          e.target.value = '';
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          handleAddNewRow('description', e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                      className="w-full bg-transparent px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none"
                    />
                  </td>
                  <td className="w-8 border-b border-border p-0"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bulk Edit Button */}
          <div className="flex justify-end mt-2">
            <Button
              variant="link"
              size="sm"
              onClick={handleStartBulkEdit}
              className="text-xs text-blue-400 hover:text-blue-300 h-auto p-0"
            >
              Bulk Edit
            </Button>
          </div>

          {/* Path Parameters Section */}
          {showPathParams && (
            <div className="mt-4">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="font-semibold text-xs text-muted-foreground">Path</span>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60" title="Path variables are automatically extracted from URL patterns like :param" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
