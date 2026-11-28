import React from 'react';
import {
  AuthConfig,
  BodyType,
  Environment,
  FormDataItem,
  HttpMethod,
  KeyValuePair,
  TabItem,
} from '../../types';
import { ParsedCurlResult } from '../../utils/curlParser';
import { ConfigSubTab } from '../../hooks/useRequestTabs';
import { WorkbenchLayout } from '../../hooks/useLayoutPreferences';
import { AuthEditor } from '../AuthEditor';
import { BodyEditor } from '../BodyEditor';
import { KeyValueEditor } from '../KeyValueEditor';
import { RequestBar } from '../RequestBar';
import { RequestBodyModeDropdown } from '../RequestBodyModeDropdown';
import { ResponseViewer } from '../ResponseViewer';
import { TestScriptEditor } from '../TestScriptEditor';
import { ToastData } from '../Toast';
import { RequestVariablesView } from './RequestVariablesView';

interface RequestWorkbenchProps {
  activeTab: TabItem;
  activeEnvironment?: Environment;
  environments: Environment[];
  configSubTab: ConfigSubTab;
  workbenchLayout: WorkbenchLayout;
  editorRatio: number;
  isDraggingEditor: boolean;
  workbenchContainerRef: React.RefObject<HTMLDivElement | null>;
  onSelectConfigSubTab: (tab: ConfigSubTab) => void;
  onStartEditorResize: (e: React.MouseEvent) => void;
  onResetEditorRatio: () => void;
  onMethodChange: (method: HttpMethod) => void;
  onUrlChange: (url: string) => void;
  onSend: () => void;
  onCancel: () => void;
  onSave: () => void;
  onOpenCodeSnippet: () => void;
  onImportCurl: (parsed: ParsedCurlResult) => void;
  onOpenEnvModal: () => void;
  onParamsChange: (params: KeyValuePair[]) => void;
  onHeadersChange: (headers: KeyValuePair[]) => void;
  onAuthChange: (auth: AuthConfig) => void;
  onBodyTypeChange: (bodyType: BodyType) => void;
  onBodyContentChange: (content: string) => void;
  onPrettifyBody: () => void;
  onFormDataChange: (items: FormDataItem[]) => void;
  onUrlEncodedChange: (items: KeyValuePair[]) => void;
  onBinaryFileChange: (filePath?: string, fileName?: string) => void;
  onTestScriptChange: (script: string) => void;
  showToast: (toast: Omit<ToastData, 'id'>) => void;
}

export const RequestWorkbench: React.FC<RequestWorkbenchProps> = ({
  activeTab,
  activeEnvironment,
  environments,
  configSubTab,
  workbenchLayout,
  editorRatio,
  isDraggingEditor,
  workbenchContainerRef,
  onSelectConfigSubTab,
  onStartEditorResize,
  onResetEditorRatio,
  onMethodChange,
  onUrlChange,
  onSend,
  onCancel,
  onSave,
  onOpenCodeSnippet,
  onImportCurl,
  onOpenEnvModal,
  onParamsChange,
  onHeadersChange,
  onAuthChange,
  onBodyTypeChange,
  onBodyContentChange,
  onPrettifyBody,
  onFormDataChange,
  onUrlEncodedChange,
  onBinaryFileChange,
  onTestScriptChange,
  showToast,
}) => {
  const activeParamsCount = activeTab.request.params.filter(
    (p) => p.enabled && p.key.trim() !== ''
  ).length;
  const activeHeadersCount = activeTab.request.headers.filter(
    (h) => h.enabled && h.key.trim() !== ''
  ).length;
  const hasBody = activeTab.request.bodyType !== 'none';
  const hasAuth = Boolean(activeTab.request.auth?.type && activeTab.request.auth.type !== 'none');
  const hasScript = Boolean(activeTab.request.testScript && activeTab.request.testScript.trim() !== '');

  const subTabs: {
    id: ConfigSubTab;
    label: string;
    count?: number;
    hasIndicator?: boolean;
  }[] = [
    { id: 'params', label: 'Params', count: activeParamsCount },
    { id: 'body', label: 'Body', hasIndicator: hasBody },
    { id: 'headers', label: 'Headers', count: activeHeadersCount },
    { id: 'auth', label: 'Auth', hasIndicator: hasAuth },
    { id: 'vars', label: 'Vars' },
    { id: 'script', label: 'Script', hasIndicator: hasScript },
    { id: 'assert', label: 'Assert' },
    { id: 'tests', label: 'Tests', hasIndicator: hasScript },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <RequestBar
        method={activeTab.request.method}
        onMethodChange={onMethodChange}
        url={activeTab.request.url}
        onUrlChange={onUrlChange}
        onSend={onSend}
        onCancel={onCancel}
        onSave={onSave}
        onOpenCodeSnippet={onOpenCodeSnippet}
        onImportCurl={onImportCurl}
        activeEnvironment={activeEnvironment}
        environments={environments}
        onOpenEnvironmentModal={onOpenEnvModal}
        isLoading={activeTab.isLoading}
        isDirty={activeTab.isDirty}
      />

      <div
        ref={workbenchContainerRef}
        className={`flex-1 flex overflow-hidden ${
          workbenchLayout === 'horizontal' ? 'flex-row' : 'flex-col'
        }`}
      >
        <div
          style={
            workbenchLayout === 'horizontal'
              ? { width: `${editorRatio * 100}%` }
              : { height: `${editorRatio * 100}%` }
          }
          className="flex flex-col overflow-hidden bg-[#1a1a1a] shrink-0 min-w-[200px] min-h-[100px]"
        >
          <div className="flex items-center justify-between px-4 bg-[#1a1a1a] select-none h-9 shrink-0">
            <div className="flex items-center h-full gap-5">
              {subTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onSelectConfigSubTab(tab.id)}
                  className={`h-full text-xs transition-colors flex items-center gap-1 cursor-pointer border-b-2 ${
                    configSubTab === tab.id
                      ? 'border-[#d99b26] text-white font-medium'
                      : 'border-transparent text-[#888888] hover:text-[#cccccc]'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <sup className="font-medium text-[10px] ml-0.5">{tab.count}</sup>
                  )}
                  {tab.hasIndicator && (
                    <span className="text-[#888888] font-bold text-[10px] ml-0.5 leading-none">
                      °
                    </span>
                  )}
                </button>
              ))}

              <button
                type="button"
                onClick={() =>
                  showToast({
                    type: 'info',
                    title: 'More Options',
                    message: 'Docs and settings available',
                  })
                }
                className="text-xs text-[#888888] hover:text-white transition-colors cursor-pointer"
                title="More tabs"
              >
                »
              </button>
            </div>

            {configSubTab === 'body' && (
              <RequestBodyModeDropdown
                bodyMode={activeTab.request.bodyType}
                onModeChange={onBodyTypeChange}
                onPrettify={onPrettifyBody}
              />
            )}
          </div>

          <div className="flex-1 overflow-auto bg-[#1a1a1a]">
            {configSubTab === 'params' && (
              <KeyValueEditor
                items={activeTab.request.params}
                onChange={onParamsChange}
                title="Query"
                keyPlaceholder="Name"
                valuePlaceholder="Value"
                descriptionPlaceholder="Description"
                activeEnvironment={activeEnvironment}
                environments={environments}
                onOpenEnvironmentModal={onOpenEnvModal}
              />
            )}

            {configSubTab === 'auth' && (
              <AuthEditor
                auth={activeTab.request.auth}
                onChange={onAuthChange}
                activeEnvironment={activeEnvironment}
                environments={environments}
                onOpenEnvironmentModal={onOpenEnvModal}
              />
            )}

            {configSubTab === 'headers' && (
              <KeyValueEditor
                items={activeTab.request.headers}
                onChange={onHeadersChange}
                title="Headers"
                keyPlaceholder="Name"
                valuePlaceholder="Value"
                descriptionPlaceholder="Description"
                activeEnvironment={activeEnvironment}
                environments={environments}
                onOpenEnvironmentModal={onOpenEnvModal}
              />
            )}

            {configSubTab === 'body' && (
              <BodyEditor
                bodyType={activeTab.request.bodyType}
                onBodyTypeChange={onBodyTypeChange}
                bodyContent={activeTab.request.bodyContent}
                onBodyContentChange={onBodyContentChange}
                formData={activeTab.request.formData}
                onFormDataChange={onFormDataChange}
                urlEncoded={activeTab.request.urlEncoded}
                onUrlEncodedChange={onUrlEncodedChange}
                binaryFilePath={activeTab.request.binaryFilePath}
                binaryFileName={activeTab.request.binaryFileName}
                onBinaryFileChange={onBinaryFileChange}
                activeEnvironment={activeEnvironment}
                environments={environments}
                onOpenEnvironmentModal={onOpenEnvModal}
              />
            )}

            {configSubTab === 'vars' && (
              <RequestVariablesView
                activeEnvironment={activeEnvironment}
                onOpenEnvModal={onOpenEnvModal}
              />
            )}

            {(configSubTab === 'script' ||
              configSubTab === 'assert' ||
              configSubTab === 'tests') && (
              <TestScriptEditor
                script={activeTab.request.testScript || ''}
                onChange={onTestScriptChange}
                activeEnvironment={activeEnvironment}
                environments={environments}
                onOpenEnvironmentModal={onOpenEnvModal}
              />
            )}
          </div>
        </div>

        <div
          onMouseDown={onStartEditorResize}
          className={`z-20 select-none group flex items-center justify-center shrink-0 ${
            workbenchLayout === 'horizontal'
              ? 'w-1.5 -ml-1 cursor-col-resize hover:bg-[#d99b26] active:bg-[#d99b26] border-r border-[#333333]'
              : 'h-1.5 -mt-1 cursor-row-resize hover:bg-[#d99b26] active:bg-[#d99b26] border-b border-[#333333]'
          } ${isDraggingEditor ? 'bg-[#d99b26]' : ''}`}
          title={`Drag to resize ${workbenchLayout === 'horizontal' ? 'columns' : 'rows'}`}
          onDoubleClick={onResetEditorRatio}
        >
          <div
            className={`rounded-full bg-[#444444] group-hover:bg-[#d99b26] transition-colors ${
              workbenchLayout === 'horizontal' ? 'w-0.5 h-6' : 'h-0.5 w-6'
            }`}
          />
        </div>

        <div
          style={
            workbenchLayout === 'horizontal'
              ? { width: `${(1 - editorRatio) * 100}%` }
              : { height: `${(1 - editorRatio) * 100}%` }
          }
          className="flex flex-col overflow-hidden bg-[#1a1a1a] shrink-0 min-w-[250px] min-h-[100px]"
        >
          <ResponseViewer
            response={activeTab.response}
            isLoading={activeTab.isLoading}
            activeUrl={activeTab.request.url}
          />
        </div>
      </div>
    </div>
  );
};
