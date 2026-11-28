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
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';

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
    <div className="flex flex-col h-full overflow-hidden bg-card">
      {/* Sub-tab navigation */}
      <div className="flex items-center justify-between px-4 bg-card border-b border-border select-none h-9 shrink-0">
        <div className="flex items-center h-full gap-5">
          <button
            onClick={() => onChangeSubTab('params')}
            className={`h-full text-xs transition-colors flex items-center gap-1 cursor-pointer border-b-2 ${
              configSubTab === 'params'
                ? 'border-amber-500 text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
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
                ? 'border-amber-500 text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Body</span>
            {req.bodyType !== 'none' && (
              <span className="text-muted-foreground font-bold text-[10px] ml-0.5 leading-none">°</span>
            )}
          </button>

          <button
            onClick={() => onChangeSubTab('headers')}
            className={`h-full text-xs transition-colors flex items-center gap-1 cursor-pointer border-b-2 ${
              configSubTab === 'headers'
                ? 'border-amber-500 text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
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
                ? 'border-amber-500 text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Auth</span>
            {req.auth?.type && req.auth.type !== 'none' && (
              <span className="text-muted-foreground font-bold text-[10px] ml-0.5 leading-none">°</span>
            )}
          </button>

          <button
            onClick={() => onChangeSubTab('vars')}
            className={`h-full text-xs transition-colors flex items-center gap-1 cursor-pointer border-b-2 ${
              configSubTab === 'vars'
                ? 'border-amber-500 text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Vars</span>
          </button>

          <button
            onClick={() => onChangeSubTab('script')}
            className={`h-full text-xs transition-colors flex items-center gap-1 cursor-pointer border-b-2 ${
              configSubTab === 'script'
                ? 'border-amber-500 text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Script</span>
            {req.testScript && req.testScript.trim() !== '' && (
              <span className="text-muted-foreground font-bold text-[10px] ml-0.5 leading-none">°</span>
            )}
          </button>

          <button
            onClick={() => onChangeSubTab('assert')}
            className={`h-full text-xs transition-colors flex items-center gap-1 cursor-pointer border-b-2 ${
              configSubTab === 'assert'
                ? 'border-amber-500 text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Assert</span>
          </button>

          <button
            onClick={() => onChangeSubTab('tests')}
            className={`h-full text-xs transition-colors flex items-center gap-1 cursor-pointer border-b-2 ${
              configSubTab === 'tests'
                ? 'border-amber-500 text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Tests</span>
            {req.testScript && req.testScript.trim() !== '' && (
              <span className="text-muted-foreground font-bold text-[10px] ml-0.5 leading-none">°</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onShowToast({ type: 'info', title: 'More Options', message: 'Docs and settings available' })}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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
      <div className="flex-1 overflow-auto bg-card">
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
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="font-semibold text-xs text-muted-foreground">Request Variables</span>
              <Button
                variant="link"
                size="sm"
                onClick={onOpenEnvironmentModal}
                className="text-xs text-blue-400 hover:text-blue-300 h-auto p-0"
              >
                Manage Environments
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Active Environment: <strong className="text-foreground">{activeEnvironment?.name || 'No Environment'}</strong>
            </p>
            {activeEnvironment?.variables && activeEnvironment.variables.length > 0 ? (
              <div className="border border-border rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 text-muted-foreground h-7 border-b border-border">
                      <th className="px-3 text-left font-normal">Name</th>
                      <th className="px-3 text-left font-normal">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeEnvironment.variables.map((v) => (
                      <tr key={v.id} className="h-7 border-b border-border/50 hover:bg-muted/40 transition-colors">
                        <td className="px-3 font-mono text-amber-500">{v.key}</td>
                        <td className="px-3 font-mono text-foreground/80">{v.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No environment variables defined.</p>
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
