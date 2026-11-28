import React, { RefObject, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDismissibleLayer } from '../hooks/useDismissibleLayer';

interface PortalMenuProps {
  isOpen: boolean;
  position: { top: number; left: number; width?: number } | null;
  onClose: () => void;
  triggerRef?: RefObject<HTMLElement | null>;
  additionalRefs?: RefObject<HTMLElement | null>[];
  ignoreTargetSelector?: string;
  className?: string;
  children: React.ReactNode;
}

export const PortalMenu: React.FC<PortalMenuProps> = ({
  isOpen,
  position,
  onClose,
  triggerRef,
  additionalRefs = [],
  ignoreTargetSelector,
  className = '',
  children,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  const refs = useMemo(
    () => [menuRef, ...(triggerRef ? [triggerRef] : []), ...additionalRefs],
    [triggerRef, additionalRefs]
  );

  useDismissibleLayer({
    isOpen,
    onClose,
    refs,
    ignoreTargetSelector,
  });

  if (!isOpen || !position) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        ...(position.width !== undefined ? { width: `${position.width}px` } : {}),
        zIndex: 9999,
      }}
      className={className}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
};
