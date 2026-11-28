import React from 'react';
import { BodyType, Environment, FormDataItem, KeyValuePair } from '../types';
import { pickBinaryFile } from '../services/fileService';
import { useVariableHover } from '../hooks/useVariableHover';
import { FileUp, Trash2 } from 'lucide-react';
import { JsonBodyEditor } from './JsonBodyEditor';
import { KeyValueEditor } from './KeyValueEditor';
import { VariableHoverTooltip } from './VariableHoverTooltip';

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
  const {
    hoveredVar,
    clearHoveredVar,
    handleMultilineMouseMove,
    handleMouseLeave,
    handleTooltipMouseEnter,
    handleTooltipMouseLeave,
  } = useVariableHover({
    activeEnvironment,
    environments,
    defaultPaddingLeft: 12,
    defaultPaddingTop: 12,
    defaultLineHeight: 18,
    measureCharWidth: false,
  });

  const handlePickBinaryFile = async () => {
    const picked = await pickBinaryFile();
    if (picked) {
      onBinaryFileChange(picked.filePath, picked.fileName);
    }
  };

  const formDataAsKeyValues: KeyValuePair[] = formData.map((f) => ({
    id: f.id,
    key: f.key,
    value: f.value,
    description: f.type === 'file' ? (f.fileName ? `File: ${f.fileName}` : 'File') : '',
    enabled: f.enabled,
  }));

  const handleFormDataKeyValuesChange = (items: KeyValuePair[]) => {
    const updated: FormDataItem[] = items.map((i) => {
      const existing = formData.find((f) => f.id === i.id);
      return {
        id: i.id,
        key: i.key,
        value: i.value,
        type: existing ? existing.type : 'text',
        fileName: existing?.fileName,
        filePath: existing?.filePath,
        enabled: i.enabled,
      };
    });
    onFormDataChange(updated);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1a1a1a] text-xs overflow-hidden">
      {bodyType === 'none' && (
        <div className="p-4 text-xs text-[#888888] select-none">No Body</div>
      )}

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

      {bodyType === 'text' && (
        <div className="relative w-full h-full">
          <textarea
            value={bodyContent}
            onChange={(e) => {
              clearHoveredVar();
              onBodyContentChange(e.target.value);
            }}
            onMouseMove={(e) => handleMultilineMouseMove(e, bodyContent)}
            onMouseLeave={handleMouseLeave}
            placeholder="Enter raw text payload..."
            spellCheck={false}
            className="w-full h-full p-4 font-mono text-xs bg-transparent text-[#cccccc] resize-none focus:outline-none leading-relaxed selection:bg-[#d99b26]/30 caret-[#d99b26]"
          />
          {hoveredVar && (
            <VariableHoverTooltip
              info={hoveredVar.info}
              x={hoveredVar.x}
              y={hoveredVar.y}
              onMouseEnter={handleTooltipMouseEnter}
              onMouseLeave={handleTooltipMouseLeave}
              onOpenEnvModal={onOpenEnvironmentModal}
            />
          )}
        </div>
      )}

      {bodyType === 'form-data' && (
        <KeyValueEditor
          items={formDataAsKeyValues}
          onChange={handleFormDataKeyValuesChange}
          title="Multipart Form"
          keyPlaceholder="Key"
          valuePlaceholder="Value"
          descriptionPlaceholder="Description"
          activeEnvironment={activeEnvironment}
          environments={environments}
          onOpenEnvironmentModal={onOpenEnvironmentModal}
          showPathParams={false}
        />
      )}

      {bodyType === 'urlencoded' && (
        <KeyValueEditor
          items={urlEncoded}
          onChange={onUrlEncodedChange}
          title="Form URL Encoded"
          keyPlaceholder="Key"
          valuePlaceholder="Value"
          descriptionPlaceholder="Description"
          activeEnvironment={activeEnvironment}
          environments={environments}
          onOpenEnvironmentModal={onOpenEnvironmentModal}
          showPathParams={false}
        />
      )}

      {bodyType === 'binary' && (
        <div className="flex flex-col items-start p-6 text-xs space-y-4">
          <span className="font-semibold text-xs text-[#888888]">File / Binary</span>
          {binaryFilePath ? (
            <div className="flex items-center gap-3 bg-[#222224] border border-[#333333] rounded px-3 py-2">
              <span className="font-mono text-xs text-[#cccccc]">
                {binaryFileName || binaryFilePath}
              </span>
              <button
                type="button"
                onClick={() => onBinaryFileChange(undefined, undefined)}
                className="text-[#888888] hover:text-rose-400 cursor-pointer p-0.5"
                title="Remove file"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handlePickBinaryFile}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#222224] hover:bg-[#26292b] border border-[#333333] rounded text-[#cccccc] transition-colors cursor-pointer"
            >
              <FileUp className="w-3.5 h-3.5 text-[#d99b26]" />
              <span>Choose File...</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
