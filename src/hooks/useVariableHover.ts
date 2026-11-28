import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Environment } from '../types';
import {
  findVariableAtCharIndex,
  findVariableInMultilineText,
  resolveVariableInfo,
  VariableResolutionInfo,
} from '../utils/variables';

export interface HoveredVariableState {
  info: VariableResolutionInfo;
  x: number;
  y: number;
}

interface UseVariableHoverOptions {
  activeEnvironment?: Environment;
  environments?: Environment[];
  defaultPaddingLeft?: number;
  defaultPaddingTop?: number;
  defaultLineHeight?: number;
  measureCharWidth?: boolean;
}

function measureElementCharWidth(el: HTMLElement): number {
  try {
    const style = window.getComputedStyle(el);
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
    if (width > 0) return width;
  } catch {
    // Fallback below
  }
  return 7.2;
}

export function useVariableHover({
  activeEnvironment,
  environments,
  defaultPaddingLeft = 10,
  defaultPaddingTop = 10,
  defaultLineHeight = 20,
  measureCharWidth = true,
}: UseVariableHoverOptions) {
  const [hoveredVar, setHoveredVar] = useState<HoveredVariableState | null>(null);
  const charWidthRef = useRef<number>(0);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingTimeout = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearPendingTimeout();
  }, [clearPendingTimeout]);

  const scheduleHide = useCallback(
    (delayMs: number) => {
      clearPendingTimeout();
      hoverTimeoutRef.current = setTimeout(() => setHoveredVar(null), delayMs);
    },
    [clearPendingTimeout]
  );

  const clearHoveredVar = useCallback(() => {
    clearPendingTimeout();
    setHoveredVar(null);
  }, [clearPendingTimeout]);

  const getCharWidth = useCallback(
    (el: HTMLElement): number => {
      if (!measureCharWidth) return 7.2;
      if (charWidthRef.current > 0) return charWidthRef.current;
      const width = measureElementCharWidth(el);
      charWidthRef.current = width;
      return width;
    },
    [measureCharWidth]
  );

  const handleSingleLineMouseMove = useCallback(
    (e: React.MouseEvent<HTMLInputElement>, text: string) => {
      const input = e.currentTarget;
      const rect = input.getBoundingClientRect();
      const style = window.getComputedStyle(input);
      const paddingLeft = parseFloat(style.paddingLeft) || defaultPaddingLeft;
      const charWidth = getCharWidth(input);
      if (charWidth <= 0) return;

      const mouseX = e.clientX - rect.left - paddingLeft + input.scrollLeft;
      if (mouseX < 0) {
        scheduleHide(100);
        return;
      }

      const charIndex = Math.floor(mouseX / charWidth);
      const matched = findVariableAtCharIndex(text, charIndex);

      if (matched) {
        clearPendingTimeout();
        const info = resolveVariableInfo(matched.varName, activeEnvironment, environments);
        const varStartPx = rect.left + paddingLeft + matched.startIndex * charWidth - input.scrollLeft;
        const varWidthPx = (matched.endIndex - matched.startIndex) * charWidth;
        setHoveredVar({
          info,
          x: varStartPx + varWidthPx / 2,
          y: rect.bottom + 6,
        });
      } else {
        scheduleHide(120);
      }
    },
    [activeEnvironment, environments, clearPendingTimeout, defaultPaddingLeft, getCharWidth, scheduleHide]
  );

  const handleMultilineMouseMove = useCallback(
    (e: React.MouseEvent<HTMLTextAreaElement>, text: string) => {
      if (!text) return;
      const textarea = e.currentTarget;
      const rect = textarea.getBoundingClientRect();
      const style = window.getComputedStyle(textarea);
      const paddingLeft = parseFloat(style.paddingLeft) || defaultPaddingLeft;
      const paddingTop = parseFloat(style.paddingTop) || defaultPaddingTop;
      const lineHeight = parseFloat(style.lineHeight) || defaultLineHeight;
      const charWidth = getCharWidth(textarea);
      if (charWidth <= 0) return;

      const mouseX = e.clientX - rect.left - paddingLeft + textarea.scrollLeft;
      const mouseY = e.clientY - rect.top - paddingTop + textarea.scrollTop;

      if (mouseX < 0 || mouseY < 0) {
        scheduleHide(100);
        return;
      }

      const lineIndex = Math.floor(mouseY / lineHeight);
      const charInLine = Math.floor(mouseX / charWidth);
      const matched = findVariableInMultilineText(text, lineIndex, charInLine);

      if (matched) {
        clearPendingTimeout();
        const info = resolveVariableInfo(matched.varName, activeEnvironment, environments);
        setHoveredVar({
          info,
          x: Math.min(window.innerWidth - 340, Math.max(16, e.clientX - 100)),
          y: Math.min(window.innerHeight - 180, e.clientY + 14),
        });
      } else {
        scheduleHide(120);
      }
    },
    [
      activeEnvironment,
      environments,
      clearPendingTimeout,
      defaultLineHeight,
      defaultPaddingLeft,
      defaultPaddingTop,
      getCharWidth,
      scheduleHide,
    ]
  );

  const showForElement = useCallback(
    (el: HTMLElement, varName: string) => {
      clearPendingTimeout();
      const rect = el.getBoundingClientRect();
      const info = resolveVariableInfo(varName, activeEnvironment, environments);
      setHoveredVar({
        info,
        x: rect.left + rect.width / 2,
        y: rect.top - 120 > 0 ? rect.top - 140 : rect.bottom + 6,
      });
    },
    [activeEnvironment, environments, clearPendingTimeout]
  );

  const handleMouseLeave = useCallback(() => scheduleHide(180), [scheduleHide]);
  const handleTooltipMouseEnter = useCallback(() => clearPendingTimeout(), [clearPendingTimeout]);
  const handleTooltipMouseLeave = useCallback(() => clearHoveredVar(), [clearHoveredVar]);

  return {
    hoveredVar,
    clearHoveredVar,
    handleSingleLineMouseMove,
    handleMultilineMouseMove,
    showForElement,
    handleMouseLeave,
    handleTooltipMouseEnter,
    handleTooltipMouseLeave,
  };
}
