import React, { useRef, useState, useEffect } from 'react';
import { Environment } from '../types';
import {
  extractVariablesFromText,
  findVariableAtCharIndex,
  resolveVariableInfo,
  VariableResolutionInfo,
} from '../utils/variables';
import { VariableHoverTooltip } from './VariableHoverTooltip';

export interface VariableInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
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
  const charWidthRef = useRef<number>(0);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [hoveredVar, setHoveredVar] = useState<{
    info: VariableResolutionInfo;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const getCharWidth = (inputEl: HTMLInputElement): number => {
    if (charWidthRef.current > 0) return charWidthRef.current;
    try {
      const style = window.getComputedStyle(inputEl);
      const span = document.createElement('span');
      span.style.font = style.font;
      span.style.fontFamily = style.fontFamily;
      span.style.fontSize = style.fontSize;
      span.style.fontWeight = style.fontWeight;
      span.style.letterSpacing = style.letterSpacing;
      span.style.visibility = 'hidden';
      span.style.position = 'absolute';
      span.style.whiteSpace = 'pre';
      span.textContent = 'M'.repeat(100);
      document.body.appendChild(span);
      const width = span.getBoundingClientRect().width / 100;
      document.body.removeChild(span);
      if (width > 0) {
        charWidthRef.current = width;
        return width;
      }
    } catch {
      // fallback
    }
    return 7.2;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHoveredVar(null);
    onChange(e.target.value);
  };

  const handleScroll = () => {
    if (backdropRef.current && inputRef.current) {
      backdropRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLInputElement>) => {
    if (type === 'password' || !inputRef.current || !value) return;
    const input = inputRef.current;
    const rect = input.getBoundingClientRect();
    const style = window.getComputedStyle(input);
    const paddingLeft = parseFloat(style.paddingLeft) || 10;

    const charWidth = getCharWidth(input);
    if (charWidth <= 0) return;

    const mouseX = e.clientX - rect.left - paddingLeft + input.scrollLeft;
    if (mouseX < 0) {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = setTimeout(() => setHoveredVar(null), 100);
      return;
    }

    const charIndex = Math.floor(mouseX / charWidth);
    const matched = findVariableAtCharIndex(value, charIndex);

    if (matched) {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      const info = resolveVariableInfo(matched.varName, activeEnvironment, environments);
      const varStartPx = rect.left + paddingLeft + (matched.startIndex * charWidth) - input.scrollLeft;
      const varWidthPx = (matched.endIndex - matched.startIndex) * charWidth;
      const x = varStartPx + varWidthPx / 2;
      const y = rect.bottom + 6;

      setHoveredVar({
        info,
        x,
        y,
      });
    } else {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredVar(null);
      }, 120);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredVar(null);
    }, 180);
  };

  const handleTooltipMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  };

  const handleTooltipMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredVar(null);
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
          <span key={`plain-${lastIndex}`}>
            {value.substring(lastIndex, v.startIndex)}
          </span>
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
      elements.push(
        <span key={`plain-${lastIndex}`}>
          {value.substring(lastIndex)}
        </span>
      );
    }

    return elements;
  };

  return (
    <div
      className={`relative flex items-center bg-[#0d1117] border border-[#30363d] rounded overflow-hidden focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500/20 transition-all ${wrapperClassName}`}
    >
      {/* Variable Highlight Backdrop */}
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
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onScroll={handleScroll}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full bg-transparent px-2.5 py-1 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none transition-all z-10 ${className}`}
        {...restProps}
      />

      {/* Variable Hover Tooltip */}
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
