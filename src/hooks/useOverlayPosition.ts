import { useState, useEffect, useCallback } from 'react';

interface OverlayPosition {
  top: number;
  left: number;
  transformOrigin: string;
}

interface UseOverlayPositionOptions {
  padding?: number;
  preferredPosition?: 'above' | 'below';
}

/**
 * Hook to calculate overlay position based on a reference rect.
 * Automatically adjusts to stay within viewport bounds.
 */
export function useOverlayPosition(
  rect: DOMRect | null,
  overlayRef: React.RefObject<HTMLElement | null>,
  options: UseOverlayPositionOptions = {}
) {
  const { padding = 8, preferredPosition = 'below' } = options;

  const [position, setPosition] = useState<OverlayPosition | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const calculatePosition = useCallback(() => {
    if (!rect || !overlayRef.current) {
      return null;
    }

    const overlay = overlayRef.current;
    const overlayRect = overlay.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate horizontal position (centered on selection)
    let left = rect.left + rect.width / 2 - overlayRect.width / 2;

    // Clamp to viewport bounds
    if (left < padding) {
      left = padding;
    } else if (left + overlayRect.width > viewportWidth - padding) {
      left = viewportWidth - overlayRect.width - padding;
    }

    // Calculate vertical position
    const spaceAbove = rect.top;
    const spaceBelow = viewportHeight - rect.bottom;

    let top: number;
    let transformOrigin: string;

    const needsFlip =
      preferredPosition === 'below'
        ? spaceBelow < overlayRect.height + padding && spaceAbove > spaceBelow
        : spaceAbove < overlayRect.height + padding && spaceBelow > spaceAbove;

    if (
      (preferredPosition === 'below' && !needsFlip) ||
      (preferredPosition === 'above' && needsFlip)
    ) {
      // Position below selection
      top = rect.bottom + padding;
      transformOrigin = 'top center';
    } else {
      // Position above selection
      top = rect.top - overlayRect.height - padding;
      transformOrigin = 'bottom center';
    }

    // Clamp vertical position
    if (top < padding) {
      top = padding;
    } else if (top + overlayRect.height > viewportHeight - padding) {
      top = viewportHeight - overlayRect.height - padding;
    }

    return { top, left, transformOrigin };
  }, [rect, overlayRef, padding, preferredPosition]);

  useEffect(() => {
    if (!rect) {
      setIsVisible(false);
      setPosition(null);
      return;
    }

    // Use requestAnimationFrame for smooth positioning
    const rafId = requestAnimationFrame(() => {
      const newPosition = calculatePosition();
      if (newPosition) {
        setPosition(newPosition);
        setIsVisible(true);
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [rect, calculatePosition]);

  // Recalculate on scroll or resize
  useEffect(() => {
    if (!rect) return;

    const handleScroll = () => {
      const newPosition = calculatePosition();
      if (newPosition) {
        setPosition(newPosition);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [rect, calculatePosition]);

  return { position, isVisible };
}
