import React, { useRef, useState, useEffect } from 'react';
import { BodyType, FormDataItem, KeyValuePair, Environment } from '../types';
import {
  FileUp,
  Plus,
  CheckSquare,
  Square,
  Trash2,
} from 'lucide-react';
import { JsonBodyEditor } from './JsonBodyEditor';
import { VariableInput } from './VariableInput';
import { VariableHoverTooltip } from './VariableHoverTooltip';
import {
  findVariableInMultilineText,
  resolveVariableInfo,
  VariableResolutionInfo,
} from '../utils/variables';

interface BodyEditorProps {
  bodyType: BodyType;
  onBodyTypeChange: (type: BodyType) => void;
  bodyContent: string;
  onBodyContentChange: (content: string) => void;
  formData?: FormDataItem[];
  onFormDataChange: (items: FormDataItem[]) => void;
  urlEncoded?: KeyValuePair[];
  onUrlEncodedChange: (items: KeyValuePair[]) => void;
  binaryFilePath?: string;
  binaryFileName?: string;
  onBinaryFileChange: (filePath?: string, fileName?: string) => void;
  activeEnvironment?: Environment;
  environments?: Environment[];
  onOpenEnvironmentModal?: () => void;
}

export const BodyEditor: React.FC<BodyEditorProps> = ({
  bodyType,
  onBodyTypeChange,
  bodyContent,
  onBodyContentChange,
  formData = [],
  onFormDataChange,
  urlEncoded = [],
  onUrlEncodedChange,
  binaryFilePath,
  binaryFileName,
  onBinaryFileChange,
  activeEnvironment,
  environments,
  onOpenEnvironmentModal,
}) => {
  const rawTextareaRef = useRef<HTMLTextAreaElement>(null);
  const rawHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [hoveredRawVar, setHoveredRawVar] = useState<{
    info: VariableResolutionInfo;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    return () => {
      if (rawHoverTimeoutRef.current) clearTimeout(rawHoverTimeoutRef.current);
    };
  }, []);

  const handleRawMouseMove = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (!rawTextareaRef.current || !bodyContent) return;
    const textarea = rawTextareaRef.current;
    const rect = textarea.getBoundingClientRect();
    const style = window.getComputedStyle(textarea);
    const paddingLeft = parseFloat(style.paddingLeft) || 12;
    const paddingTop = parseFloat(style.paddingTop) || 12;
    const lineHeight = parseFloat(style.lineHeight) || 18;
    const charWidth = 7.2;

    const mouseX = e.clientX - rect.left - paddingLeft + textarea.scrollLeft;
    const mouseY = e.clientY - rect.top - paddingTop + textarea.scrollTop;

    if (mouseX < 0 || mouseY < 0) {
      if (rawHoverTimeoutRef.current) clearTimeout(rawHoverTimeoutRef.current);
      rawHoverTimeoutRef.current = setTimeout(() => setHoveredRawVar(null), 100);
      return;
    }

    const lineIndex = Math.floor(mouseY / lineHeight);
    const charInLine = Math.floor(mouseX / charWidth);

    const matched = findVariableInMultilineText(bodyContent, lineIndex, charInLine);
    if (matched) {
      if (rawHoverTimeoutRef.current) clearTimeout(rawHoverTimeoutRef.current);
      const info = resolveVariableInfo(matched.varName, activeEnvironment, environments);
      setHoveredRawVar({
        info,
        x: Math.min(window.innerWidth - 340, Math.max(16, e.clientX - 100)),
        y: Math.min(window.innerHeight - 180, e.clientY + 14),
      });
    } else {
      if (rawHoverTimeoutRef.current) clearTimeout(rawHoverTimeoutRef.current);
      rawHoverTimeoutRef.current = setTimeout(() => {
        setHoveredRawVar(null);
      }, 120);
    }
  };

  const handleRawMouseLeave = () => {
    if (rawHoverTimeoutRef.current) clearTimeout(rawHoverTimeoutRef.current);
    rawHoverTimeoutRef.current = setTimeout(() => {
      setHoveredRawVar(null);
    }, 180);
  };

  // Form-Data item actions
  const handleAddFormData = () => {
    const newItem: FormDataItem = {
      id: Math.random().toString(36).substring(2, 9),
      key: '',
      value: '',
      type: 'text',
      enabled: true,
    };
    onFormDataChange([...formData, newItem]);
  };

  const handleUpdateFormData = (id: string, field: keyof FormDataItem, value: any) => {
    onFormDataChange(
      formData.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleDeleteFormData = (id: string) => {
    onFormDataChange(formData.filter((item) => item.id !== id));
  };

  const handlePickFileForFormData = async (id: string) => {
    if (window.interceptor?.openFileDialog) {
      const res = await window.interceptor.openFileDialog({
        title: 'Select File for Form Data',
        readContent: false,
      });
      if (!res.canceled && res.filePath) {
        handleUpdateFormData(id, 'filePath', res.filePath);
        handleUpdateFormData(id, 'fileName', res.fileName || res.filePath.split('/').pop());
      }
    }
  };

  // URL-Encoded item actions
  const handleAddUrlEncoded = () => {
    const newItem: KeyValuePair = {
      id: Math.random().toString(36).substring(2, 9),
      key: '',
      value: '',
      enabled: true,
    };
    onUrlEncodedChange([...urlEncoded, newItem]);
  };

  const handleUpdateUrlEncoded = (id: string, field: keyof KeyValuePair, value: any) => {
    onUrlEncodedChange(
      urlEncoded.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleDeleteUrlEncoded = (id: string) => {
    onUrlEncodedChange(urlEncoded.filter((item) => item.id !== id));
  };

  // Binary file picker
  const handlePickBinaryFile = async () => {
    if (window.interceptor?.openFileDialog) {
      const res = await window.interceptor.openFileDialog({
        title: 'Select Binary File',
        readContent: false,
      });
      if (!res.canceled && res.filePath) {
        onBinaryFileChange(res.filePath, res.fileName || res.filePath.split('/').pop());
      }
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs">
      {/* Header Bar with Body Type Radio Selectors */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#30363d]/50 flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          {(
            [
              { type: 'none', label: 'None' },
              { type: 'json', label: 'JSON' },
              { type: 'form-data', label: 'Form-Data' },
              { type: 'urlencoded', label: 'x-www-form-urlencoded' },
              { type: 'text', label: 'Raw Text' },
              { type: 'binary', label: 'Binary File' },
            ] as const
          ).map(({ type, label }) => (
            <label key={type} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="bodyType"
                value={type}
                checked={bodyType === type}
                onChange={() => onBodyTypeChange(type)}
                className="text-sky-500 focus:ring-0 bg-[#0d1117] border-[#30363d] cursor-pointer"
              />
              <span
                className={bodyType === type ? 'text-sky-400 font-semibold' : 'text-slate-400'}
              >
                {label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Body Content Area */}
      <div className="flex-1 relative overflow-hidden rounded border border-[#30363d] bg-[#0d1117]">
        {/* NONE */}
        {bodyType === 'none' && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <p>This request has no body payload.</p>
            <button
              onClick={() => onBodyTypeChange('json')}
              className="mt-2 text-sky-400 hover:underline cursor-pointer"
            >
              Switch to JSON body
            </button>
          </div>
        )}

        {/* JSON BODY EDITOR (Postman-style with variable highlighting and hover preview) */}
        {bodyType === 'json' && (
          <JsonBodyEditor
            value={bodyContent}
            onChange={onBodyContentChange}
            placeholder={'{\n  "title": "New Post",\n  "userId": 1\n}'}
            activeEnvironment={activeEnvironment}
            environments={environments}
            onOpenEnvironmentModal={onOpenEnvironmentModal}
          />
        )}

        {/* RAW TEXT */}
        {bodyType === 'text' && (
          <div className="relative w-full h-full">
            <textarea
              ref={rawTextareaRef}
              value={bodyContent}
              onChange={(e) => {
                setHoveredRawVar(null);
                onBodyContentChange(e.target.value);
              }}
              onMouseMove={handleRawMouseMove}
              onMouseLeave={handleRawMouseLeave}
              placeholder="Enter raw text payload (supports {{variable}} references)..."
              spellCheck={false}
              className="w-full h-full p-3 font-mono text-xs bg-transparent text-slate-200 resize-none focus:outline-none leading-relaxed"
            />
            {hoveredRawVar && (
              <VariableHoverTooltip
                info={hoveredRawVar.info}
                x={hoveredRawVar.x}
                y={hoveredRawVar.y}
                onMouseEnter={() => {
                  if (rawHoverTimeoutRef.current) clearTimeout(rawHoverTimeoutRef.current);
                }}
                onMouseLeave={() => {
                  if (rawHoverTimeoutRef.current) clearTimeout(rawHoverTimeoutRef.current);
                  setHoveredRawVar(null);
                }}
                onOpenEnvModal={onOpenEnvironmentModal}
              />
            )}
          </div>
        )}

        {/* MULTIPART FORM-DATA */}
        {bodyType === 'form-data' && (
          <div className="flex flex-col h-full p-2 space-y-2 overflow-y-auto">
            <div className="flex items-center justify-between pb-1 border-b border-[#30363d]/40">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                Multipart Form-Data Fields
              </span>
              <button
                type="button"
                onClick={handleAddFormData}
                className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-medium px-2 py-0.5 rounded hover:bg-sky-500/10 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Field</span>
              </button>
            </div>

            {formData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-slate-500">
                <p>No form-data fields added.</p>
                <button
                  onClick={handleAddFormData}
                  className="mt-2 text-sky-400 hover:underline cursor-pointer"
                >
                  + Add first field
                </button>
              </div>
            ) : (
              formData.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 p-1.5 rounded bg-[#161b22] border border-[#30363d]/60 group"
                >
                  <button
                    type="button"
                    onClick={() => handleUpdateFormData(item.id, 'enabled', !item.enabled)}
                    className="text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {item.enabled ? (
                      <CheckSquare className="w-4 h-4 text-sky-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>

                  <div className="w-1/3">
                    <VariableInput
                      placeholder="Key"
                      value={item.key}
                      onChange={(val) => handleUpdateFormData(item.id, 'key', val)}
                      activeEnvironment={activeEnvironment}
                      environments={environments}
                      onOpenEnvironmentModal={onOpenEnvironmentModal}
                    />
                  </div>

                  <select
                    value={item.type}
                    onChange={(e) =>
                      handleUpdateFormData(item.id, 'type', e.target.value as 'text' | 'file')
                    }
                    className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-slate-300 focus:outline-none focus:border-sky-500 font-medium cursor-pointer"
                  >
                    <option value="text">Text</option>
                    <option value="file">File</option>
                  </select>

                  {item.type === 'file' ? (
                    <div className="flex-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePickFileForFormData(item.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-slate-200 border border-[#30363d] cursor-pointer"
                      >
                        <FileUp className="w-3.5 h-3.5 text-sky-400" />
                        <span>{item.fileName || 'Select File...'}</span>
                      </button>
                      {item.filePath && (
                        <span className="text-[10px] text-slate-500 truncate font-mono">
                          {item.filePath}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1">
                      <VariableInput
                        placeholder="Value"
                        value={item.value}
                        onChange={(val) => handleUpdateFormData(item.id, 'value', val)}
                        activeEnvironment={activeEnvironment}
                        environments={environments}
                        onOpenEnvironmentModal={onOpenEnvironmentModal}
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteFormData(item.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* URLENCODED */}
        {bodyType === 'urlencoded' && (
          <div className="flex flex-col h-full p-2 space-y-2 overflow-y-auto">
            <div className="flex items-center justify-between pb-1 border-b border-[#30363d]/40">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                x-www-form-urlencoded Fields
              </span>
              <button
                type="button"
                onClick={handleAddUrlEncoded}
                className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-medium px-2 py-0.5 rounded hover:bg-sky-500/10 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Row</span>
              </button>
            </div>

            {urlEncoded.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-slate-500">
                <p>No urlencoded fields added.</p>
                <button
                  onClick={handleAddUrlEncoded}
                  className="mt-2 text-sky-400 hover:underline cursor-pointer"
                >
                  + Add first row
                </button>
              </div>
            ) : (
              urlEncoded.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 p-1.5 rounded bg-[#161b22] border border-[#30363d]/60 group"
                >
                  <button
                    type="button"
                    onClick={() => handleUpdateUrlEncoded(item.id, 'enabled', !item.enabled)}
                    className="text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {item.enabled ? (
                      <CheckSquare className="w-4 h-4 text-sky-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>

                  <div className="w-1/3">
                    <VariableInput
                      placeholder="Key"
                      value={item.key}
                      onChange={(val) => handleUpdateUrlEncoded(item.id, 'key', val)}
                      activeEnvironment={activeEnvironment}
                      environments={environments}
                      onOpenEnvironmentModal={onOpenEnvironmentModal}
                    />
                  </div>

                  <div className="flex-1">
                    <VariableInput
                      placeholder="Value"
                      value={item.value}
                      onChange={(val) => handleUpdateUrlEncoded(item.id, 'value', val)}
                      activeEnvironment={activeEnvironment}
                      environments={environments}
                      onOpenEnvironmentModal={onOpenEnvironmentModal}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteUrlEncoded(item.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* BINARY FILE */}
        {bodyType === 'binary' && (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-3">
            <div className="p-4 rounded-full bg-[#161b22] border border-[#30363d]">
              <FileUp className="w-8 h-8 text-sky-400" />
            </div>

            <div>
              <p className="text-slate-300 font-medium">Select a file to send as binary data</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
                Stream binary payloads (images, PDFs, archives, custom binaries) directly in the request stream without browser memory limits.
              </p>
            </div>

            {binaryFilePath ? (
              <div className="flex flex-col items-center gap-2 mt-2">
                <div className="px-3 py-1.5 rounded bg-[#161b22] border border-sky-500/40 text-sky-300 font-mono text-xs flex items-center gap-2">
                  <span>{binaryFileName || 'Selected file'}</span>
                  <button
                    type="button"
                    onClick={() => onBinaryFileChange(undefined, undefined)}
                    className="text-slate-400 hover:text-rose-400 cursor-pointer"
                    title="Remove binary file"
                  >
                    ×
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 font-mono truncate max-w-md">
                  {binaryFilePath}
                </span>
                <button
                  type="button"
                  onClick={handlePickBinaryFile}
                  className="text-xs text-sky-400 hover:underline cursor-pointer"
                >
                  Change file...
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handlePickBinaryFile}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-medium shadow transition-colors cursor-pointer"
              >
                Choose File...
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
