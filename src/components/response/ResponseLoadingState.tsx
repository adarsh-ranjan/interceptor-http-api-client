import React from 'react';

interface ResponseLoadingStateProps {
  activeUrl?: string;
}

export const ResponseLoadingState: React.FC<ResponseLoadingStateProps> = ({ activeUrl }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-card p-8">
      <div className="relative flex items-center justify-center w-16 h-16 mb-4">
        <div className="absolute w-full h-full rounded-full bg-amber-500/10 animate-ping" />
        <div className="relative w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      </div>
      <p className="text-sm font-medium text-foreground">Executing request...</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm text-center truncate font-mono">
        {activeUrl || 'Connecting to host'}
      </p>
    </div>
  );
};
