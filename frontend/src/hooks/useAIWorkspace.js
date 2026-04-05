import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useAIWorkspace Hook
 * Shows an AI menu in two ways:
 *  1. Alt + Click anywhere (legacy shortcut)
 *  2. Floating "Ask AI" bubble appears automatically when text is selected
 * 
 * Selection is captured on mousedown/selectionchange BEFORE a click can clear it.
 */
export function useAIWorkspace(options = {}) {
  const [aiMenuPos, setAiMenuPos] = useState(null);
  const [contextText, setContextText] = useState('');
  const [selectionBubble, setSelectionBubble] = useState(null); // { x, y } for the floating button

  const { getEditorSelection } = options;

  // Saved selection captured before click clears it
  const savedSelection = useRef('');
  const savedPos = useRef(null);

  // Helper: get current selection text via custom fn or window selection
  const readSelection = useCallback((e) => {
    if (getEditorSelection) {
      return getEditorSelection(e) || '';
    }
    return window.getSelection()?.toString() || '';
  }, [getEditorSelection]);

  // 1. Track selection changes to show the floating "Ask AI" bubble
  useEffect(() => {
    const handleSelectionChange = () => {
      const text = readSelection();
      if (text && text.trim().length > 2) {
        // Get selection bounding rect
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          try {
            const range = sel.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            if (rect.width > 0 || rect.height > 0) {
              const bubbleX = rect.left + rect.width / 2;
              const bubbleY = rect.top - 12; // above selection
              savedSelection.current = text;
              savedPos.current = { x: rect.left + rect.width / 2, y: rect.bottom + 10 };
              setSelectionBubble({ x: bubbleX, y: bubbleY });
            }
          } catch (_) {}
        }
      } else {
        setSelectionBubble(null);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [readSelection]);

  // 2. Capture selection on mousedown (before click clears it)
  useEffect(() => {
    const handleMouseDown = (e) => {
      // Sample the selection at mousedown time
      const text = readSelection(e);
      if (text && text.trim()) {
        savedSelection.current = text;
        savedPos.current = { x: e.clientX, y: e.clientY };
      }
    };

    document.addEventListener('mousedown', handleMouseDown, { capture: true });
    return () => document.removeEventListener('mousedown', handleMouseDown, { capture: true });
  }, [readSelection]);

  // 3. Alt + Click trigger (legacy, uses saved selection)
  useEffect(() => {
    const handleMouseUp = (e) => {
      if (e.altKey && e.button === 0) {
        // Use saved selection (captured before click could clear it)
        const text = savedSelection.current || readSelection(e);
        setAiMenuPos({ x: e.clientX, y: e.clientY });
        setContextText(text);
        setSelectionBubble(null);
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('mouseup', handleMouseUp, { capture: true });
    return () => document.removeEventListener('mouseup', handleMouseUp, { capture: true });
  }, [readSelection]);

  // Called by the floating bubble button
  const openFromBubble = useCallback(() => {
    const text = savedSelection.current || readSelection();
    const pos = savedPos.current || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    setContextText(text);
    setAiMenuPos(pos);
    setSelectionBubble(null);
  }, [readSelection]);

  const closeMenu = useCallback(() => {
    setAiMenuPos(null);
    setContextText('');
  }, []);

  const closeBubble = useCallback(() => {
    setSelectionBubble(null);
  }, []);

  return {
    aiMenuPos,
    contextText,
    closeMenu,
    selectionBubble,
    openFromBubble,
    closeBubble,
  };
}
