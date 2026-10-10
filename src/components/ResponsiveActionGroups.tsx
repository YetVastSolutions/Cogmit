import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";

export interface ToolbarItem {
  id: string;
  node: React.ReactNode;
  priority: number; // 1 is highest
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
}: {
  visibleItems: ToolbarItem[];
  hiddenItems: ToolbarItem[];
  isRight: boolean;
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
        <div key={item.id}>{item.node}</div>
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
              {hiddenItems.map(item => (
                <div key={item.id}>{item.node}</div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {isRight && visibleItems.map(item => (
        <div key={item.id}>{item.node}</div>
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
    // Initial measurement
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
        rightHidden: []
      };
    }

    const ARROW_WIDTH = 48; // generous width for the arrow + gap
    const GAP = 8; 
    const GROUP_GAP = 16; 

    const allItems = [
      ...leftItems.map(item => ({ ...item, isRight: false, score: item.priority + 0.1 })),
      ...rightItems.map(item => ({ ...item, isRight: true, score: item.priority + 0.5 })) 
    ];
    
    // Sort items so highest score (lowest priority) comes first. 
    allItems.sort((a, b) => b.score - a.score);

    let bestLeftVisible = leftItems;
    let bestRightVisible = rightItems;
    let bestLeftHidden: typeof leftItems = [];
    let bestRightHidden: typeof rightItems = [];

    for (let hideCount = 0; hideCount <= allItems.length; hideCount++) {
      const hiddenIds = new Set(allItems.slice(0, hideCount).map(item => item.id));
      
      const leftVis = leftItems.filter(item => !hiddenIds.has(item.id));
      const leftHid = leftItems.filter(item => hiddenIds.has(item.id));
      
      const rightVis = rightItems.filter(item => !hiddenIds.has(item.id));
      const rightHid = rightItems.filter(item => hiddenIds.has(item.id));
      
      let leftWidth = 0;
      leftVis.forEach((item, idx) => {
        leftWidth += (itemWidths[item.id] || 100);
        if (idx > 0) leftWidth += GAP;
      });
      if (leftHid.length > 0) {
        if (leftVis.length > 0) leftWidth += GAP;
        leftWidth += (itemWidths['left-arrow'] || ARROW_WIDTH);
      }
      
      let rightWidth = 0;
      rightVis.forEach((item, idx) => {
        rightWidth += (itemWidths[item.id] || 100);
        if (idx > 0) rightWidth += GAP;
      });
      if (rightHid.length > 0) {
        if (rightVis.length > 0) rightWidth += GAP;
        rightWidth += (itemWidths['right-arrow'] || ARROW_WIDTH);
      }
      
      let reqWidth = leftWidth + rightWidth;
      if (leftWidth > 0 && rightWidth > 0) {
        reqWidth += GROUP_GAP;
      }
      
      if (reqWidth <= containerWidth || hideCount === allItems.length) {
        bestLeftVisible = leftVis;
        bestLeftHidden = leftHid;
        bestRightVisible = rightVis;
        bestRightHidden = rightHid;
        break;
      }
    }
    
    return {
      leftVisible: bestLeftVisible,
      leftHidden: bestLeftHidden,
      rightVisible: bestRightVisible,
      rightHidden: bestRightHidden
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
        {leftItems.map(item => <div key={item.id} data-id={item.id}>{item.node}</div>)}
        {rightItems.map(item => <div key={item.id} data-id={item.id}>{item.node}</div>)}
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
        />
        <ExpandableGroup
          isRight={true}
          visibleItems={visibleState.rightVisible}
          hiddenItems={visibleState.rightHidden}
        />
      </div>
    </div>
  );
}
