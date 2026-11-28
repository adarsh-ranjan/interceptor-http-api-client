import React, { useRef } from 'react';
import { Environment } from '../types';
import { extractVariablesFromText, resolveVariableInfo } from '../utils/variables';
import { useVariableHover } from '../hooks/useVariableHover';
import { VariableHoverTooltip } from './VariableHoverTooltip';

export interface VariableInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  activeEnvironment?: Environment;
  environments?: Environment[];
  onOpenEnvironmentModal?: () => void;
  wrapperClassName?: string;
}

export const VariableInput: React.FC<VariableInputProps> = ({
  value,
  onChange,
  activeEnvironment,
  environments,
  onOpenEnvironmentModal,
  wrapperClassName = '',
  className = '',
  placeholder,
  type = 'text',
  disabled,
  onKeyDown,
  ...restProps
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const {
    hoveredVar,
    clearHoveredVar,
    handleSingleLineMouseMove,
    handleMouseLeave,
    handleTooltipMouseEnter,
    handleTooltipMouseLeave,
  } = useVariableHover({ activeEnvironment, environments, defaultPaddingLeft: 10 });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearHoveredVar();
    onChange(e.target.value);
  };

  const handleScroll = () => {
    if (backdropRef.current && inputRef.current) {
      backdropRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  };

  const renderBackdropContent = () => {
    if (!value || type === 'password') return null;
    const vars = extractVariablesFromText(value);
    if (vars.length === 0) return null;

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    vars.forEach((v, idx) => {
      if (v.startIndex > lastIndex) {
        elements.push(
          <span key={`plain-${lastIndex}`}>{value.substring(lastIndex, v.startIndex)}</span>
        );
      }

      const info = resolveVariableInfo(v.varName, activeEnvironment, environments);
      elements.push(
        <span
          key={`var-${v.startIndex}-${idx}`}
          className={`rounded px-0.5 -mx-0.5 ${
            info.isResolved
              ? 'bg-amber-500/15 border border-amber-500/30'
              : 'bg-rose-500/15 border border-rose-500/30'
          }`}
        >
          {v.fullMatch}
        </span>
      );
      lastIndex = v.endIndex;
    });

    if (lastIndex < value.length) {
      elements.push(<span key={`plain-${lastIndex}`}>{value.substring(lastIndex)}</span>);
    }

    return elements;
  };

  return (
    <div
      className={`relative flex items-center bg-[#1a1a1a] border border-[#333333] rounded overflow-hidden focus-within:border-[#444444] transition-colors ${wrapperClassName}`}
    >
      <div
        ref={backdropRef}
        className="absolute inset-0 pointer-events-none flex items-center overflow-hidden px-2.5 py-1 text-xs font-mono whitespace-pre select-none text-transparent"
        aria-hidden="true"
      >
        {renderBackdropContent()}
      </div>

      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={handleInputChange}
        onMouseMove={(e) => {
          if (type === 'password' || !value) return;
          handleSingleLineMouseMove(e, value);
        }}
        onMouseLeave={handleMouseLeave}
        onScroll={handleScroll}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full bg-transparent px-2.5 py-1 text-xs font-mono text-[#cccccc] placeholder:text-[#666666] focus:outline-none transition-all z-10 ${className}`}
        {...restProps}
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
  );
};
