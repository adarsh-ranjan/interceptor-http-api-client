import React, { useRef, useState, useEffect } from 'react';
import { BodyType, FormDataItem, KeyValuePair, Environment } from '../types';
import { FileUp, Trash2 } from 'lucide-react';
import { JsonBodyEditor } from './JsonBodyEditor';
import { KeyValueEditor } from './KeyValueEditor';
import { VariableHoverTooltip } from './VariableHoverTooltip';
import { Button } from './ui/button';
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

  const handlePickBinaryFile = async () => {
    if (window.interceptor?.openFileDialog) {
      const res = await window.interceptor.openFileDialog();
      if (res && res.filePath) {
        onBinaryFileChange(res.filePath, res.fileName);
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          onBinaryFileChange((file as any).path || file.name, file.name);
        }
      };
      input.click();
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
    <div className="flex-1 flex flex-col h-full bg-card text-xs overflow-hidden">
      {/* NO BODY */}
      {bodyType === 'none' && (
        <div className="p-4 text-xs text-muted-foreground select-none">
          No Body
        </div>
      )}

      {/* JSON BODY EDITOR */}
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
            placeholder="Enter raw text payload..."
            spellCheck={false}
            className="w-full h-full p-4 font-mono text-xs bg-transparent text-foreground resize-none focus:outline-none leading-relaxed selection:bg-amber-500/30 caret-amber-500"
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

      {/* URLENCODED */}
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

      {/* BINARY FILE */}
      {bodyType === 'binary' && (
        <div className="flex flex-col items-start p-6 text-xs space-y-4">
          <span className="font-semibold text-xs text-muted-foreground">File / Binary</span>
          {binaryFilePath ? (
            <div className="flex items-center gap-3 bg-card border border-border rounded-md px-3 py-2">
              <span className="font-mono text-xs text-foreground">{binaryFileName || binaryFilePath}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => onBinaryFileChange(undefined, undefined)}
                className="text-muted-foreground hover:text-destructive h-6 w-6"
                title="Remove file"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePickBinaryFile}
              className="flex items-center gap-2 text-foreground"
            >
              <FileUp className="w-3.5 h-3.5 text-amber-500" />
              <span>Choose File...</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
