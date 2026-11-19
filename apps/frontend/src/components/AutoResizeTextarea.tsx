import React, { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef } from "react";

export interface AutoResizeTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minHeight?: number;
}

/**
 * Custom textarea component that automatically adjusts its height based on
 * its content and container width so the full text is always visible
 * without internal scrolling.
 */
export const AutoResizeTextarea = React.forwardRef<
  HTMLTextAreaElement,
  AutoResizeTextareaProps
>(({ value, onChange, onInput, minHeight = 24, className = "", style, ...props }, forwardedRef) => {
  const internalRef = useRef<HTMLTextAreaElement | null>(null);

  useImperativeHandle(forwardedRef, () => internalRef.current as HTMLTextAreaElement);

  const adjustHeight = useCallback(() => {
    const el = internalRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.overflowY = "hidden";
    const nextHeight = Math.max(minHeight, el.scrollHeight);
    el.style.height = `${nextHeight}px`;
  }, [minHeight]);

  // Synchronously resize before paint whenever value changes
  useLayoutEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  // Recalculate height if the container width changes (which changes line wrapping)
  useEffect(() => {
    const el = internalRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    let lastWidth = el.clientWidth;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const currentWidth = entry.contentRect.width;
        if (Math.abs(currentWidth - lastWidth) > 0.5) {
          lastWidth = currentWidth;
          adjustHeight();
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [adjustHeight]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    adjustHeight();
    onChange?.(e);
  };

  const handleInput = (e: React.InputEvent<HTMLTextAreaElement>) => {
    adjustHeight();
    onInput?.(e);
  };

  return (
    <textarea
      {...props}
      ref={internalRef}
      value={value}
      rows={1}
      onChange={handleChange}
      onInput={handleInput}
      className={`auto-resize-textarea ${className}`.trim()}
      style={{
        ...style,
        overflowY: "hidden",
        resize: "none",
      }}
    />
  );
});

AutoResizeTextarea.displayName = "AutoResizeTextarea";
