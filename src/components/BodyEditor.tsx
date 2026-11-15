import React, { useState } from 'react';
import { BodyType, FormDataItem, KeyValuePair } from '../types';
import {
  Sparkles,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileUp,
  Plus,
  CheckSquare,
  Square,
  FileCode,
} from 'lucide-react';

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
}) => {
  const [formatStatus, setFormatStatus] = useState<string | null>(null);

  const handleFormatJson = () => {
    if (!bodyContent.trim()) return;
    try {
      const parsed = JSON.parse(bodyContent);
      onBodyContentChange(JSON.stringify(parsed, null, 2));
      setFormatStatus('Formatted');
      setTimeout(() => setFormatStatus(null), 2000);
    } catch (e: any) {
      setFormatStatus(`Invalid JSON: ${e.message}`);
      setTimeout(() => setFormatStatus(null), 3500);
    }
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
                className="text-sky-500 focus:ring-0 bg-[#0d1117] border-[#30363d]"
              />
              <span
                className={bodyType === type ? 'text-sky-400 font-semibold' : 'text-slate-400'}
              >
                {label}
              </span>
            </label>
          ))}
        </div>

        {/* JSON / Text formatting helpers */}
        {bodyType === 'json' && (
          <div className="flex items-center gap-2">
            {formatStatus && (
              <span
                className={`flex items-center gap-1 ${
                  formatStatus.startsWith('Invalid') ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {formatStatus.startsWith('Invalid') ? (
                  <AlertCircle className="w-3.5 h-3.5" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                {formatStatus}
              </span>
            )}
            <button
              type="button"
              onClick={handleFormatJson}
              className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-medium px-2 py-0.5 rounded hover:bg-sky-500/10"
              title="Prettify JSON indentation"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Prettify</span>
            </button>
          </div>
        )}
      </div>

      {/* Body Content Area */}
      <div className="flex-1 relative overflow-hidden rounded border border-[#30363d] bg-[#0d1117]">
        {/* NONE */}
        {bodyType === 'none' && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <p>This request has no body payload.</p>
            <button
              onClick={() => onBodyTypeChange('json')}
              className="mt-2 text-sky-400 hover:underline"
            >
              Switch to JSON body
            </button>
          </div>
        )}

        {/* JSON & RAW TEXT */}
        {(bodyType === 'json' || bodyType === 'text') && (
          <textarea
            value={bodyContent}
            onChange={(e) => onBodyContentChange(e.target.value)}
            placeholder={
              bodyType === 'json'
                ? '{\n  "title": "New Post",\n  "userId": 1\n}'
                : 'Enter raw text payload...'
            }
            spellCheck={false}
            className="w-full h-full p-3 font-mono text-xs bg-transparent text-slate-200 resize-none focus:outline-none leading-relaxed"
          />
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
                className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-medium px-2 py-0.5 rounded hover:bg-sky-500/10"
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
                  className="mt-2 text-sky-400 hover:underline"
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
                    className="text-slate-400 hover:text-slate-200"
                  >
                    {item.enabled ? (
                      <CheckSquare className="w-4 h-4 text-sky-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>

                  <input
                    type="text"
                    placeholder="Key"
                    value={item.key}
                    onChange={(e) => handleUpdateFormData(item.id, 'key', e.target.value)}
                    className="w-1/3 bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                  />

                  <select
                    value={item.type}
                    onChange={(e) =>
                      handleUpdateFormData(item.id, 'type', e.target.value as 'text' | 'file')
                    }
                    className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-slate-300 focus:outline-none focus:border-sky-500 font-medium"
                  >
                    <option value="text">Text</option>
                    <option value="file">File</option>
                  </select>

                  {item.type === 'file' ? (
                    <div className="flex-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePickFileForFormData(item.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-slate-200 border border-[#30363d]"
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
                    <input
                      type="text"
                      placeholder="Value"
                      value={item.value}
                      onChange={(e) => handleUpdateFormData(item.id, 'value', e.target.value)}
                      className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteFormData(item.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
                className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-medium px-2 py-0.5 rounded hover:bg-sky-500/10"
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
                  className="mt-2 text-sky-400 hover:underline"
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
                    className="text-slate-400 hover:text-slate-200"
                  >
                    {item.enabled ? (
                      <CheckSquare className="w-4 h-4 text-sky-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>

                  <input
                    type="text"
                    placeholder="Key"
                    value={item.key}
                    onChange={(e) => handleUpdateUrlEncoded(item.id, 'key', e.target.value)}
                    className="w-1/3 bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                  />

                  <input
                    type="text"
                    placeholder="Value"
                    value={item.value}
                    onChange={(e) => handleUpdateUrlEncoded(item.id, 'value', e.target.value)}
                    className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1 text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                  />

                  <button
                    type="button"
                    onClick={() => handleDeleteUrlEncoded(item.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
          <div className="flex flex-col items-center justify-center h-full p-6 text-center text-slate-400 space-y-3">
            <FileCode className="w-10 h-10 text-sky-400 stroke-[1.5]" />
            <div>
              <p className="text-slate-200 font-medium">Binary Payload Upload</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Send raw files, images, archives, or blobs directly as the request body.
              </p>
            </div>

            {binaryFilePath ? (
              <div className="flex items-center gap-3 bg-[#161b22] border border-[#30363d] rounded-md px-3 py-2 max-w-md w-full justify-between">
                <div className="truncate text-left">
                  <p className="text-slate-200 font-medium truncate font-mono">
                    {binaryFileName || 'Selected File'}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate font-mono">
                    {binaryFilePath}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePickBinaryFile}
                    className="px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-slate-200 font-medium"
                  >
                    Change
                  </button>
                  <button
                    onClick={() => onBinaryFileChange(undefined, undefined)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handlePickBinaryFile}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-sky-600 hover:bg-sky-500 text-white font-medium shadow-sm transition-all"
              >
                <FileUp className="w-4 h-4" />
                <span>Choose File to Upload</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
