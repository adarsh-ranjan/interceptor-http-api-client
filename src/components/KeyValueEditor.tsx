import React, { useState } from 'react';
import { Environment, KeyValuePair } from '../types';
import { generateId } from '../utils/id';
import { HelpCircle, Trash2 } from 'lucide-react';
import { VariableInput } from './VariableInput';

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
    onChange(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleDelete = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const handleToggle = (id: string) => {
    onChange(items.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item)));
  };

  const handleToggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    onChange(items.map((i) => ({ ...i, enabled: checked })));
  };

  const handleAddNewRow = (field: 'key' | 'value' | 'description', val: string) => {
    if (!val.trim() && field === 'key') return;
    onChange([
      ...items,
      {
        id: generateId(),
        key: field === 'key' ? val : '',
        value: field === 'value' ? val : '',
        description: field === 'description' ? val : '',
        enabled: true,
      },
    ]);
  };

  const handleStartBulkEdit = () => {
    setBulkText(items.map((item) => `${item.key || ''}:${item.value || ''}`).join('\n'));
    setIsBulkEdit(true);
  };

  const handleSaveBulkEdit = () => {
    const newItems: KeyValuePair[] = bulkText
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const colonIndex = line.indexOf(':');
        return {
          id: generateId(),
          key: colonIndex !== -1 ? line.slice(0, colonIndex).trim() : line.trim(),
          value: colonIndex !== -1 ? line.slice(colonIndex + 1).trim() : '',
          enabled: true,
          description: '',
        };
      });
    onChange(newItems);
    setIsBulkEdit(false);
  };

  const renderQuickAddCell = (
    field: 'key' | 'value' | 'description',
    placeholder: string,
    isMono = true
  ) => (
    <td className="border-b border-r border-[#333333] p-0">
      <input
        type="text"
        placeholder={placeholder}
        onBlur={(e) => {
          if (e.target.value.trim()) {
            handleAddNewRow(field, e.target.value);
            e.target.value = '';
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
            handleAddNewRow(field, e.currentTarget.value);
            e.currentTarget.value = '';
          }
        }}
        className={`w-full bg-transparent px-2.5 py-1 text-xs text-[#cccccc] placeholder:text-[#555555] outline-none ${
          isMono ? 'font-mono' : ''
        }`}
      />
    </td>
  );

  const allChecked = items.length > 0 && items.every((i) => i.enabled);
  const someChecked = items.some((i) => i.enabled);

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 py-3 select-none text-xs">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold text-xs text-[#888888]">{title}</span>
      </div>

      {isBulkEdit ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder="key:value"
            className="w-full h-40 bg-[#1a1a1a] border border-[#333333] rounded p-2.5 font-mono text-xs text-[#cccccc] focus:outline-none focus:border-[#444444] resize-none"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setIsBulkEdit(false)}
              className="px-2.5 py-1 text-xs rounded text-[#888888] hover:text-[#cccccc] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveBulkEdit}
              className="px-3 py-1 text-xs rounded bg-[#d99b26] hover:bg-[#c2871a] text-white font-medium transition-colors cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="border border-[#333333] rounded overflow-clip bg-[#1a1a1a]">
            <table className="w-full border-collapse table-fixed text-xs">
              <thead>
                <tr className="bg-[#1a1a1a] text-[#888888] select-none h-8">
                  <td className="w-8 text-center border-b border-r border-[#333333] p-0">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={(el) => {
                        if (el) el.indeterminate = !allChecked && someChecked;
                      }}
                      onChange={handleToggleAll}
                      className="cursor-pointer accent-[#d99b26]"
                    />
                  </td>
                  <td className="w-[32%] px-2.5 py-1.5 border-b border-r border-[#333333] font-normal text-[#888888]">
                    {keyPlaceholder}
                  </td>
                  <td className="w-[35%] px-2.5 py-1.5 border-b border-r border-[#333333] font-normal text-[#888888]">
                    {valuePlaceholder}
                  </td>
                  <td className="px-2.5 py-1.5 border-b border-r border-[#333333] font-normal text-[#888888]">
                    {descriptionPlaceholder}
                  </td>
                  <td className="w-8 border-b border-[#333333] p-0"></td>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="h-8 hover:bg-[#222224] transition-colors group">
                    <td className="w-8 text-center border-b border-r border-[#333333] p-0">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={() => handleToggle(item.id)}
                        className="cursor-pointer accent-[#d99b26]"
                      />
                    </td>
                    <td className="border-b border-r border-[#333333] p-0">
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
                    <td className="border-b border-r border-[#333333] p-0">
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
                    <td className="border-b border-r border-[#333333] p-0">
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) => handleUpdate(item.id, 'description', e.target.value)}
                        placeholder="Description"
                        className="w-full bg-transparent px-2.5 py-1 text-xs text-[#cccccc] placeholder:text-[#666666] outline-none"
                      />
                    </td>
                    <td className="w-8 text-center border-b border-[#333333] p-0">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 text-[#666666] hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Delete row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                <tr className="h-8 hover:bg-[#222224] transition-colors">
                  <td className="w-8 text-center border-b border-r border-[#333333] p-0 opacity-40">
                    <input type="checkbox" disabled className="accent-[#d99b26]" />
                  </td>
                  {renderQuickAddCell('key', 'Name', true)}
                  {renderQuickAddCell('value', 'Value', true)}
                  {renderQuickAddCell('description', 'Description', false)}
                  <td className="w-8 border-b border-[#333333] p-0"></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-2">
            <button
              onClick={handleStartBulkEdit}
              className="text-xs text-[#3b82f6] hover:underline cursor-pointer select-none"
            >
              Bulk Edit
            </button>
          </div>

          {showPathParams && (
            <div className="mt-4">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="font-semibold text-xs text-[#888888]">Path</span>
                <HelpCircle
                  className="w-3.5 h-3.5 text-[#666666]"
                  title="Path variables are automatically extracted from URL patterns like :param"
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
