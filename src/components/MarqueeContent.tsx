"use client";

import React, { useRef, useState, useEffect, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MarqueeContentProps {
  items: ReactNode[];
  staticItems?: ReactNode[];
  layout?: "same-row" | "static-above";
}

export function MarqueeContent({ 
  items, 
  staticItems,
  layout = "same-row"
}: MarqueeContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && contentRef.current) {
        setIsOverflowing(contentRef.current.scrollWidth > containerRef.current.clientWidth);
      }
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [items, staticItems, layout]);

  const isStaticAbove = layout === "static-above";

  return (
    <div className={cn("flex w-full min-w-0", isStaticAbove ? "flex-col gap-y-1.5" : "flex-row items-center")}>
      {/* STATIC SECTION */}
      {staticItems && staticItems.length > 0 && (
        <div className="flex flex-row items-center gap-x-4 pr-4 shrink-0 whitespace-nowrap">
          {staticItems}
          {!isStaticAbove && <span className="opacity-50">|</span>}
        </div>
      )}

      {/* TIMESTAMP/MARQUEE SECTION */}
      <div 
        className="flex-1 min-w-0 relative cursor-default"
        ref={containerRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Invisible placeholder to reserve exactly one row of height */}
        <div className="flex flex-row overflow-hidden whitespace-nowrap invisible pointer-events-none" aria-hidden="true">
          <span>Placeholder</span>
        </div>

        {/* NORMAL STATE (Marquee) */}
        <div 
          className={cn(
            "flex overflow-hidden w-full whitespace-nowrap absolute top-0 left-0 transition-opacity",
            isHovered ? "opacity-0" : "opacity-100"
          )} 
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div 
            className={cn(
              "flex flex-row whitespace-nowrap w-max", 
              isOverflowing ? "animate-marquee" : ""
            )}
            style={{ animationPlayState: isHovered ? 'paused' : 'running' }}
          >
            <div ref={contentRef} className="flex flex-row gap-x-8 pr-8 shrink-0">
              {items}
            </div>
            {isOverflowing && (
              <div className="flex flex-row gap-x-8 pr-8 shrink-0" aria-hidden="true">
                {items}
              </div>
            )}
          </div>
        </div>

        {/* HOVER STATE (High Z-Index Overlay) */}
        {isHovered && (
          <div className="absolute top-0 left-0 flex flex-col gap-y-1 bg-background z-[100] whitespace-nowrap p-3 -top-3 -left-3 rounded-md shadow-lg border border-border">
            {items}
          </div>
        )}
      </div>
    </div>
  );
}
