import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";

export interface ToolbarItem {
  id: string;
  node: React.ReactNode;
  compactNode?: React.ReactNode;
  hideOrder?: number; // 1 hides first, 2 hides second. undefined means never hide.
}

interface ResponsiveActionGroupsProps {
  leftItems: ToolbarItem[];
  rightItems: ToolbarItem[];
  className?: string;
}

function ExpandableGroup({
  visibleItems,
  hiddenItems,
  isRight,
  isCompact,
}: {
  visibleItems: ToolbarItem[];
  hiddenItems: ToolbarItem[];
  isRight: boolean;
  isCompact: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const collapse = () => setExpanded(false);

  const resetTimeout = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(collapse, 3000);
  };

  const handleInteract = (e: React.SyntheticEvent) => {
    if (expanded) {
      resetTimeout();
    }
  };

  useEffect(() => {
    if (expanded) {
      resetTimeout();
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [expanded]);

  useEffect(() => {
    if (hiddenItems.length === 0) {
      setExpanded(false);
    }
  }, [hiddenItems.length]);

  return (
    <div className="flex items-center gap-2 relative">
      {!isRight && visibleItems.map(item => (
        <div key={item.id}>{isCompact && item.compactNode ? item.compactNode : item.node}</div>
      ))}
      
      {hiddenItems.length > 0 && (
        <div className="relative">
          <Button 
            variant="outline" 
            className="w-10 h-10 px-0 flex items-center justify-center shrink-0" 
            onClick={() => {
               if (expanded) {
                 collapse();
               } else {
                 setExpanded(true);
               }
            }}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {isRight ? <ChevronLeft className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
          </Button>
          
          {expanded && (
            <div 
              className={`absolute top-full mt-2 ${isRight ? 'right-0' : 'left-0'} bg-popover border border-border shadow-lg rounded-md p-2 flex flex-col gap-2 z-50 min-w-[120px]`}
              onClick={handleInteract}
              onKeyDown={handleInteract}
              onFocusCapture={handleInteract}
            >
              {/* Inside dropdown we typically show full nodes for clarity, or compact if they prefer. Let's show full. */}
              {hiddenItems.map(item => (
                <div key={item.id}>{item.node}</div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {isRight && visibleItems.map(item => (
        <div key={item.id}>{isCompact && item.compactNode ? item.compactNode : item.node}</div>
      ))}
    </div>
  );
}

export function ResponsiveActionGroups({ leftItems, rightItems, className = "" }: ResponsiveActionGroupsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [itemWidths, setItemWidths] = useState<Record<string, number>>({});
  
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    setContainerWidth(containerRef.current.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!measureRef.current) return;
    const widths: Record<string, number> = {};
    const children = measureRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      const id = child.getAttribute('data-id');
      if (id) {
        widths[id] = child.getBoundingClientRect().width;
      }
    }
    setItemWidths(widths);
  }, [leftItems, rightItems, containerWidth]);

  const visibleState = useMemo(() => {
    if (containerWidth === null || Object.keys(itemWidths).length === 0) {
      return {
        leftVisible: leftItems,
        leftHidden: [],
        rightVisible: rightItems,
        rightHidden: [],
        isCompact: false,
      };
    }

    const ARROW_WIDTH = 48; // arrow + gap
    const GAP = 8; 
    const GROUP_GAP = 16; 

    const maxHideOrder = Math.max(
      0,
      ...leftItems.map(i => i.hideOrder || 0),
      ...rightItems.map(i => i.hideOrder || 0)
    );

    // Helper to calculate required width
    const getReqWidth = (isCompact: boolean, hideThreshold: number) => {
      let leftWidth = 0;
      let leftHidCount = 0;
      let leftVisCount = 0;

      leftItems.forEach(item => {
        if (item.hideOrder !== undefined && item.hideOrder <= hideThreshold) {
          leftHidCount++;
        } else {
          const w = itemWidths[`${isCompact ? 'compact' : 'full'}-${item.id}`] || itemWidths[`full-${item.id}`] || 100;
          if (leftVisCount > 0) leftWidth += GAP;
          leftWidth += w;
          leftVisCount++;
        }
      });
      if (leftHidCount > 0) {
        if (leftVisCount > 0) leftWidth += GAP;
        leftWidth += (itemWidths['left-arrow'] || ARROW_WIDTH);
      }

      let rightWidth = 0;
      let rightHidCount = 0;
      let rightVisCount = 0;

      rightItems.forEach(item => {
        if (item.hideOrder !== undefined && item.hideOrder <= hideThreshold) {
          rightHidCount++;
        } else {
          const w = itemWidths[`${isCompact ? 'compact' : 'full'}-${item.id}`] || itemWidths[`full-${item.id}`] || 100;
          if (rightVisCount > 0) rightWidth += GAP;
          rightWidth += w;
          rightVisCount++;
        }
      });
      if (rightHidCount > 0) {
        if (rightVisCount > 0) rightWidth += GAP;
        rightWidth += (itemWidths['right-arrow'] || ARROW_WIDTH);
      }

      let reqWidth = leftWidth + rightWidth;
      if (leftWidth > 0 && rightWidth > 0) {
        reqWidth += GROUP_GAP;
      }
      return reqWidth;
    };

    // Stage 0: Full width, no hidden
    if (getReqWidth(false, 0) <= containerWidth) {
      return {
        leftVisible: leftItems, leftHidden: [],
        rightVisible: rightItems, rightHidden: [],
        isCompact: false,
      };
    }

    // Stage 1: Compact width, no hidden
    if (getReqWidth(true, 0) <= containerWidth) {
      return {
        leftVisible: leftItems, leftHidden: [],
        rightVisible: rightItems, rightHidden: [],
        isCompact: true,
      };
    }

    // Stage 2+: Hide progressively
    let bestThreshold = maxHideOrder; // Hide everything possible by default if it's very narrow
    for (let t = 1; t <= maxHideOrder; t++) {
      if (getReqWidth(true, t) <= containerWidth) {
        bestThreshold = t;
        break;
      }
    }

    const leftVisible = leftItems.filter(i => i.hideOrder === undefined || i.hideOrder > bestThreshold);
    const leftHidden = leftItems.filter(i => i.hideOrder !== undefined && i.hideOrder <= bestThreshold);
    
    const rightVisible = rightItems.filter(i => i.hideOrder === undefined || i.hideOrder > bestThreshold);
    const rightHidden = rightItems.filter(i => i.hideOrder !== undefined && i.hideOrder <= bestThreshold);

    return {
      leftVisible, leftHidden,
      rightVisible, rightHidden,
      isCompact: true,
    };
  }, [containerWidth, itemWidths, leftItems, rightItems]);

  return (
    <div className={`relative w-full ${className}`}>
      {/* Invisible measurement container */}
      <div 
        ref={measureRef} 
        className="absolute top-0 left-0 opacity-0 pointer-events-none flex gap-2 w-max h-0 overflow-hidden"
        aria-hidden="true"
      >
        {leftItems.map(item => <div key={`full-${item.id}`} data-id={`full-${item.id}`}>{item.node}</div>)}
        {leftItems.map(item => <div key={`compact-${item.id}`} data-id={`compact-${item.id}`}>{item.compactNode || item.node}</div>)}
        {rightItems.map(item => <div key={`full-${item.id}`} data-id={`full-${item.id}`}>{item.node}</div>)}
        {rightItems.map(item => <div key={`compact-${item.id}`} data-id={`compact-${item.id}`}>{item.compactNode || item.node}</div>)}
        <div data-id="left-arrow">
          <Button variant="outline" className="w-10 h-10 px-0 flex items-center justify-center shrink-0"><ChevronRight className="w-4 h-4 shrink-0" /></Button>
        </div>
        <div data-id="right-arrow">
          <Button variant="outline" className="w-10 h-10 px-0 flex items-center justify-center shrink-0"><ChevronLeft className="w-4 h-4 shrink-0" /></Button>
        </div>
      </div>

      {/* Actual visible layout */}
      <div ref={containerRef} className="flex items-center justify-between w-full h-full">
        <ExpandableGroup
          isRight={false}
          visibleItems={visibleState.leftVisible}
          hiddenItems={visibleState.leftHidden}
          isCompact={visibleState.isCompact}
        />
        <ExpandableGroup
          isRight={true}
          visibleItems={visibleState.rightVisible}
          hiddenItems={visibleState.rightHidden}
          isCompact={visibleState.isCompact}
        />
      </div>
    </div>
  );
}
