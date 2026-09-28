"use client";

import React, { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CogMetadataRowProps {
  children: React.ReactNode;
  className?: string;
  tooltipClassName?: string;
}

export function CogMetadataRow({ children, className, tooltipClassName }: CogMetadataRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && contentRef.current) {
        // Adding a tiny buffer to avoid sub-pixel false positives
        const overflowing = contentRef.current.scrollWidth > containerRef.current.clientWidth + 1;
        setIsOverflowing(overflowing);
      }
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    
    // Also use ResizeObserver for the container itself
    const resizeObserver = new ResizeObserver(() => checkOverflow());
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", checkOverflow);
      resizeObserver.disconnect();
    };
  }, [children]);

  return (
    <div 
      className="relative flex items-center w-full min-w-0 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      tabIndex={isOverflowing ? 0 : -1}
    >
      <div 
        ref={containerRef} 
        className={cn("flex items-center overflow-hidden w-full", className)}
      >
        <div
          ref={contentRef}
          className={cn(
            "flex items-center whitespace-nowrap min-w-max",
            isOverflowing && "animate-marquee delay-1000 group-hover:[animation-play-state:paused] focus:[animation-play-state:paused] motion-reduce:animate-none"
          )}
        >
          {/* First half */}
          <div className="flex items-center gap-2 pr-8">
            {children}
          </div>
          
          {/* Duplicate half for seamless marquee loop */}
          {isOverflowing && (
            <div className="flex items-center gap-2 pr-8" aria-hidden="true">
              {children}
            </div>
          )}
        </div>
      </div>

      {/* Tooltip / Popover (only visible if overflowing and hovered/focused) */}
      {isOverflowing && isHovered && (
        <div 
          className={cn(
            "absolute left-0 z-50 flex items-center gap-2 px-3 py-2 text-sm",
            "bg-popover text-popover-foreground border border-border shadow-md rounded-md whitespace-nowrap",
            "top-full mt-1 -translate-y-1 opacity-100 transition-opacity pointer-events-none",
            tooltipClassName
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
