import React from 'react';
import {
  TabItem,
  Environment,
  KeyValuePair,
  AuthConfig,
  BodyType,
  FormDataItem,
} from '../../types';
import { KeyValueEditor } from '../KeyValueEditor';
import { AuthEditor } from '../AuthEditor';
import { BodyEditor } from '../BodyEditor';
import { TestScriptEditor } from '../TestScriptEditor';
import { RequestBodyModeDropdown } from '../RequestBodyModeDropdown';

export type ConfigSubTab =
  | 'params'
  | 'auth'
  | 'headers'
  | 'body'
  | 'vars'
  | 'script'
  | 'assert'
  | 'tests';

interface RequestConfigurationPanelProps {
  tab: TabItem;
  configSubTab: ConfigSubTab;
  onChangeSubTab: (tab: ConfigSubTab) => void;
  activeEnvironment?: Environment;
  environments?: Environment[];
  onOpenEnvironmentModal: () => void;
  onParamsChange: (params: KeyValuePair[]) => void;
  onHeadersChange: (headers: KeyValuePair[]) => void;
  onAuthChange: (auth: AuthConfig) => void;
  onBodyTypeChange: (type: BodyType) => void;
  onBodyContentChange: (content: string) => void;
  onFormDataChange: (formData: FormDataItem[]) => void;
  onUrlEncodedChange: (urlEncoded: KeyValuePair[]) => void;
  onBinaryFileChange: (filePath?: string, fileName?: string) => void;
  onTestScriptChange: (script: string) => void;
  onPrettifyBody: () => void;
  onShowToast: (toast: { type: 'info' | 'success' | 'error'; title: string; message: string }) => void;
}

export const RequestConfigurationPanel: React.FC<RequestConfigurationPanelProps> = ({
  tab,
  configSubTab,
  onChangeSubTab,
  activeEnvironment,
  environments,
  onOpenEnvironmentModal,
  onParamsChange,
  onHeadersChange,
  onAuthChange,
  onBodyTypeChange,
  onBodyContentChange,
  onFormDataChange,
  onUrlEncodedChange,
  onBinaryFileChange,
  onTestScriptChange,
  onPrettifyBody,
  onShowToast,
}) => {
  const req = tab.request;
  const activeParamsCount = req.params.filter((p) => p.enabled && p.key.trim() !== '').length;
  const activeHeadersCount = req.headers.filter((h) => h.enabled && h.key.trim() !== '').length;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#1a1a1a]">
      {/* Sub-tab navigation (Bruno-style ResponsiveTabs) */}
      <div className="flex items-center justify-between px-4 bg-[#1a1a1a] select-none h-9 shrink-0">
        <div className="flex items-center h-full gap-5">
          <button
            onClick={() => onChangeSubTab('params')}
            className={`h-full text-xs transition-colors flex items-center gap-1 cursor-pointer border-b-2 ${
              configSubTab === 'params'
                ? 'border-[#d99b26] text-white font-medium'
                : 'border-transparent text-[#888888] hover:text-[#cccccc]'
            }`}
          >
            <span>Params</span>
            {activeParamsCount > 0 && (
              <sup className="font-medium text-[10px] ml-0.5">{activeParamsCount}</sup>
            )}
          </button>

          <button
            onClick={() => onChangeSubTab('body')}
            className={`h-full text-xs transition-colors flex items-center gap-1 cursor-pointer border-b-2 ${
              configSubTab === 'body'
                ? 'border-[#d99b26] text-white font-medium'
                : 'border-transparent text-[#888888] hover:text-[#cccccc]'
            }`}
          >
            <span>Body</span>
            {req.bodyType !== 'none' && (
              <span className="text-[#888888] font-bold text-[10px] ml-0.5 leading-none">°</span>
            )}
          </button>

          <button
            onClick={() => onChangeSubTab('headers')}
            className={`h-full text-xs transition-colors flex items-center gap-1 cursor-pointer border-b-2 ${
              configSubTab === 'headers'
                ? 'border-[#d99b26] text-white font-medium'
                : 'border-transparent text-[#888888] hover:text-[#cccccc]'
            }`}
          >
            <span>Headers</span>
            {activeHeadersCount > 0 && (
              <sup className="font-medium text-[10px] ml-0.5">{activeHeadersCount}</sup>
            )}
          </button>

          <button
            onClick={() => onChangeSubTab('auth')}
            className={`h-full text-xs transition-colors flex items-center gap-1 cursor-pointer border-b-2 ${
              configSubTab === 'auth'
                ? 'border-[#d99b26] text-white font-medium'
                : 'border-transparent text-[#888888] hover:text-[#cccccc]'
            }`}
          >
            <span>Auth</span>
            {req.auth?.type && req.auth.type !== 'none' && (
              <span className="text-[#888888] font-bold text-[10px] ml-0.5 leading-none">°</span>
            )}
          </button>

          <button
            onClick={() => onChangeSubTab('vars')}
            className={`h-full text-xs transition-colors flex items-center gap-1 cursor-pointer border-b-2 ${
              configSubTab === 'vars'
                ? 'border-[#d99b26] text-white font-medium'
                : 'border-transparent text-[#888888] hover:text-[#cccccc]'
            }`}
          >
            <span>Vars</span>
          </button>

          <button
            onClick={() => onChangeSubTab('script')}
            className={`h-full text-xs transition-colors flex items-center gap-1 cursor-pointer border-b-2 ${
              configSubTab === 'script'
                ? 'border-[#d99b26] text-white font-medium'
                : 'border-transparent text-[#888888] hover:text-[#cccccc]'
            }`}
          >
            <span>Script</span>
            {req.testScript && req.testScript.trim() !== '' && (
              <span className="text-[#888888] font-bold text-[10px] ml-0.5 leading-none">°</span>
            )}
          </button>

          <button
            onClick={() => onChangeSubTab('assert')}
            className={`h-full text-xs transition-colors flex items-center gap-1 cursor-pointer border-b-2 ${
              configSubTab === 'assert'
                ? 'border-[#d99b26] text-white font-medium'
                : 'border-transparent text-[#888888] hover:text-[#cccccc]'
            }`}
          >
            <span>Assert</span>
          </button>

          <button
            onClick={() => onChangeSubTab('tests')}
            className={`h-full text-xs transition-colors flex items-center gap-1 cursor-pointer border-b-2 ${
              configSubTab === 'tests'
                ? 'border-[#d99b26] text-white font-medium'
                : 'border-transparent text-[#888888] hover:text-[#cccccc]'
            }`}
          >
            <span>Tests</span>
            {req.testScript && req.testScript.trim() !== '' && (
              <span className="text-[#888888] font-bold text-[10px] ml-0.5 leading-none">°</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onShowToast({ type: 'info', title: 'More Options', message: 'Docs and settings available' })}
            className="text-xs text-[#888888] hover:text-white transition-colors cursor-pointer"
            title="More tabs"
          >
            »
          </button>
        </div>

        {/* Right side helper when Body is selected */}
        {configSubTab === 'body' && (
          <RequestBodyModeDropdown
            bodyMode={req.bodyType}
            onModeChange={onBodyTypeChange}
            onPrettify={onPrettifyBody}
          />
        )}
      </div>

      {/* Sub-tab view body */}
      <div className="flex-1 overflow-auto bg-[#1a1a1a]">
        {configSubTab === 'params' && (
          <KeyValueEditor
            items={req.params}
            onChange={onParamsChange}
            title="Query"
            keyPlaceholder="Name"
            valuePlaceholder="Value"
            descriptionPlaceholder="Description"
            activeEnvironment={activeEnvironment}
            environments={environments}
            onOpenEnvironmentModal={onOpenEnvironmentModal}
          />
        )}

        {configSubTab === 'auth' && (
          <AuthEditor
            auth={req.auth}
            onChange={onAuthChange}
            activeEnvironment={activeEnvironment}
            environments={environments}
            onOpenEnvironmentModal={onOpenEnvironmentModal}
          />
        )}

        {configSubTab === 'headers' && (
          <KeyValueEditor
            items={req.headers}
            onChange={onHeadersChange}
            title="Headers"
            keyPlaceholder="Name"
            valuePlaceholder="Value"
            descriptionPlaceholder="Description"
            activeEnvironment={activeEnvironment}
            environments={environments}
            onOpenEnvironmentModal={onOpenEnvironmentModal}
          />
        )}

        {configSubTab === 'body' && (
          <BodyEditor
            bodyType={req.bodyType}
            onBodyTypeChange={onBodyTypeChange}
            bodyContent={req.bodyContent}
            onBodyContentChange={onBodyContentChange}
            formData={req.formData}
            onFormDataChange={onFormDataChange}
            urlEncoded={req.urlEncoded}
            onUrlEncodedChange={onUrlEncodedChange}
            binaryFilePath={req.binaryFilePath}
            binaryFileName={req.binaryFileName}
            onBinaryFileChange={onBinaryFileChange}
            activeEnvironment={activeEnvironment}
            environments={environments}
            onOpenEnvironmentModal={onOpenEnvironmentModal}
          />
        )}

        {configSubTab === 'vars' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#333333]">
              <span className="font-semibold text-xs text-[#888888]">Request Variables</span>
              <button
                onClick={onOpenEnvironmentModal}
                className="text-xs text-[#3b82f6] hover:underline cursor-pointer"
              >
                Manage Environments
              </button>
            </div>
            <p className="text-xs text-[#888888]">
              Active Environment: <strong className="text-white">{activeEnvironment?.name || 'No Environment'}</strong>
            </p>
            {activeEnvironment?.variables && activeEnvironment.variables.length > 0 ? (
              <div className="border border-[#333333] rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#222224] text-[#888888] h-7 border-b border-[#333333]">
                      <th className="px-3 text-left font-normal">Name</th>
                      <th className="px-3 text-left font-normal">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeEnvironment.variables.map((v) => (
                      <tr key={v.id} className="h-7 border-b border-[#333333]/50 hover:bg-[#222224]">
                        <td className="px-3 font-mono text-[#d99b26]">{v.key}</td>
                        <td className="px-3 font-mono text-[#cccccc]">{v.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-[#666666] italic">No environment variables defined.</p>
            )}
          </div>
        )}

        {(configSubTab === 'script' || configSubTab === 'assert' || configSubTab === 'tests') && (
          <TestScriptEditor
            script={req.testScript || ''}
            onChange={onTestScriptChange}
            activeEnvironment={activeEnvironment}
            environments={environments}
            onOpenEnvironmentModal={onOpenEnvironmentModal}
          />
        )}
      </div>
    </div>
  );
};
