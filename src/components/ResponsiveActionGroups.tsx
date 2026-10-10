import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { Menu } from 'lucide-react';
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

function OptionsDropdown({
  hiddenItems,
}: {
  hiddenItems: ToolbarItem[];
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

  // If no hidden items, force close
  useEffect(() => {
    if (hiddenItems.length === 0) {
      setExpanded(false);
    }
  }, [hiddenItems.length]);

  const toggleOptions = () => {
    if (hiddenItems.length === 0) return;
    if (expanded) {
      collapse();
    } else {
      setExpanded(true);
    }
  };

  return (
    <div className="relative shrink-0">
      <Button 
        variant="outline" 
        className="w-10 h-10 px-0 flex items-center justify-center shrink-0" 
        onClick={toggleOptions}
        aria-label={expanded ? "Close Options" : "Options"}
        aria-expanded={expanded}
      >
        <Menu className="w-4 h-4 shrink-0" />
      </Button>
      
      {expanded && hiddenItems.length > 0 && (
        <div 
          className="absolute top-full mt-2 right-0 bg-popover border border-border shadow-lg rounded-md p-2 flex flex-col gap-2 z-50 min-w-[150px]"
          onClick={handleInteract}
          onKeyDown={(e) => {
            handleInteract(e);
            if (e.key === 'Escape') collapse();
          }}
          onFocusCapture={handleInteract}
        >
          {hiddenItems.map(item => (
            <div key={item.id} onClick={collapse} className="w-full">
              {item.node}
            </div>
          ))}
        </div>
      )}
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
        leftPermanent: leftItems.filter(i => i.hideOrder === undefined),
        leftHideableVis: leftItems.filter(i => i.hideOrder !== undefined),
        rightHideableVis: rightItems.filter(i => i.hideOrder !== undefined),
        rightPermanent: rightItems.filter(i => i.hideOrder === undefined),
        hiddenItems: [],
        isCompact: false,
      };
    }

    const OPTIONS_WIDTH = itemWidths['options-btn'] || 48; // includes typical gap conceptually
    const GAP = 8; 
    const GROUP_GAP = 16; 

    const maxHideOrder = Math.max(
      0,
      ...leftItems.map(i => i.hideOrder || 0),
      ...rightItems.map(i => i.hideOrder || 0)
    );

    const getReqWidth = (isCompact: boolean, hideThreshold: number) => {
      let reqWidth = 0;
      let leftCount = 0;
      let rightCount = 0;

      leftItems.forEach(item => {
        if (item.hideOrder !== undefined && item.hideOrder <= hideThreshold) {
          // hidden
        } else {
          const w = itemWidths[`${isCompact ? 'compact' : 'full'}-${item.id}`] || itemWidths[`full-${item.id}`] || 100;
          if (leftCount > 0) reqWidth += GAP;
          reqWidth += w;
          leftCount++;
        }
      });

      // Options button is always present, now in right group
      if (rightCount > 0) reqWidth += GAP;
      reqWidth += OPTIONS_WIDTH;
      rightCount++;

      rightItems.forEach(item => {
        if (item.hideOrder !== undefined && item.hideOrder <= hideThreshold) {
          // hidden
        } else {
          const w = itemWidths[`${isCompact ? 'compact' : 'full'}-${item.id}`] || itemWidths[`full-${item.id}`] || 100;
          if (rightCount > 0) reqWidth += GAP;
          reqWidth += w;
          rightCount++;
        }
      });

      if (leftCount > 0 && rightCount > 0) {
        reqWidth += GROUP_GAP;
      }
      return reqWidth;
    };

    let bestThreshold = 0;
    let bestCompact = false;

    if (getReqWidth(false, 0) <= containerWidth) {
      bestThreshold = 0;
      bestCompact = false;
    } else if (getReqWidth(true, 0) <= containerWidth) {
      bestThreshold = 0;
      bestCompact = true;
    } else {
      bestCompact = true;
      bestThreshold = maxHideOrder; // max hiding by default
      for (let t = 1; t <= maxHideOrder; t++) {
        if (getReqWidth(true, t) <= containerWidth) {
          bestThreshold = t;
          break;
        }
      }
    }

    const leftPermanent = leftItems.filter(i => i.hideOrder === undefined);
    const leftHideableVis = leftItems.filter(i => i.hideOrder !== undefined && i.hideOrder > bestThreshold);
    const leftHidden = leftItems.filter(i => i.hideOrder !== undefined && i.hideOrder <= bestThreshold);
    
    const rightHideableVis = rightItems.filter(i => i.hideOrder !== undefined && i.hideOrder > bestThreshold);
    const rightPermanent = rightItems.filter(i => i.hideOrder === undefined);
    const rightHidden = rightItems.filter(i => i.hideOrder !== undefined && i.hideOrder <= bestThreshold);

    // Keep hidden actions in their original logical order within the dropdown.
    // Order: Left items first, then Right items.
    const hiddenItems = [...leftHidden, ...rightHidden];

    return {
      leftPermanent, leftHideableVis,
      rightHideableVis, rightPermanent,
      hiddenItems,
      isCompact: bestCompact,
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
        <div data-id="options-btn">
          <Button variant="outline" className="w-10 h-10 px-0 flex items-center justify-center shrink-0"><Menu className="w-4 h-4 shrink-0" /></Button>
        </div>
      </div>

      {/* Actual visible layout */}
      <div ref={containerRef} className="flex items-center justify-between w-full h-full gap-2 sm:gap-4">
        
        {/* Left Area */}
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 shrink">
          {visibleState.leftPermanent.map(item => (
            <div key={item.id} className="min-w-0 shrink">
              {visibleState.isCompact && item.compactNode ? item.compactNode : item.node}
            </div>
          ))}

          {visibleState.leftHideableVis.map(item => (
            <div key={item.id} className="shrink-0">
              {visibleState.isCompact && item.compactNode ? item.compactNode : item.node}
            </div>
          ))}
        </div>

        {/* Right Area */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <OptionsDropdown hiddenItems={visibleState.hiddenItems} />

          {visibleState.rightHideableVis.map(item => (
            <div key={item.id} className="shrink-0">
              {visibleState.isCompact && item.compactNode ? item.compactNode : item.node}
            </div>
          ))}
          
          {visibleState.rightPermanent.map(item => (
            <div key={item.id} className="shrink-0">
              {visibleState.isCompact && item.compactNode ? item.compactNode : item.node}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
