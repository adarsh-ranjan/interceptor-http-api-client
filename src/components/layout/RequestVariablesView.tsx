import React from 'react';
import { Environment } from '../../types';

interface RequestVariablesViewProps {
  activeEnvironment?: Environment;
  onOpenEnvModal: () => void;
}

export const RequestVariablesView: React.FC<RequestVariablesViewProps> = ({
  activeEnvironment,
  onOpenEnvModal,
}) => {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-[#333333]">
        <span className="font-semibold text-xs text-[#888888]">Request Variables</span>
        <button
          onClick={onOpenEnvModal}
          className="text-xs text-[#3b82f6] hover:underline cursor-pointer"
        >
          Manage Environments
        </button>
      </div>
      <p className="text-xs text-[#888888]">
        Active Environment:{' '}
        <strong className="text-white">{activeEnvironment?.name || 'No Environment'}</strong>
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
  );
};
