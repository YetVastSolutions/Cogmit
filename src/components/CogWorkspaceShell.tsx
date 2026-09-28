import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CogWorkspaceShellProps {
  titleContent: ReactNode;
  actionContent: ReactNode;
  metadataContent?: ReactNode;
  control1Content?: ReactNode;
  control2Content?: ReactNode;
  control3Content?: ReactNode;
  control4Content?: ReactNode;
  children: ReactNode;
}

export function CogWorkspaceShell({
  titleContent,
  actionContent,
  metadataContent,
  control1Content,
  control2Content,
  control3Content,
  control4Content,
  children,
}: CogWorkspaceShellProps) {
  return (
    <div className="flex flex-col pt-8 px-4 sm:px-8 bg-background w-full max-w-[var(--page-content-max-width)] mx-auto h-[calc(100vh-64px)] overflow-hidden">
      {/* FIXED HEADER AREA */}
      <div className="shrink-0 bg-background z-10 flex flex-col gap-4 pb-4 border-b border-border">
        {/* ROW 1: Title and Actions */}
        <div className="flex items-center gap-4 w-full">
          <div className="w-[80%] flex items-center min-w-0">
            {titleContent}
          </div>
          <div className="w-[20%] flex items-center justify-end min-w-0">
            {actionContent}
          </div>
        </div>

        {/* ROW 2: Metadata */}
        {metadataContent && (
          <div className="w-full text-xs text-muted-foreground">
            {metadataContent}
          </div>
        )}

        {/* ROW 3: Options (4 controls) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
          {/* Mobile: Row 1 - Project | Versions */}
          <div className="w-full min-w-0 order-1 sm:order-1">{control1Content}</div>
          <div className="w-full min-w-0 order-2 sm:order-2">{control2Content}</div>
          {/* Mobile: Row 2 - Save/Edit | Publish */}
          <div className="w-full min-w-0 order-3 sm:order-3">{control3Content}</div>
          <div className="w-full min-w-0 order-4 sm:order-4">{control4Content}</div>
        </div>
      </div>

      {/* SCROLLABLE CONTENT AREA */}
      <div className="flex-1 overflow-y-auto min-h-0 py-6">
        {children}
      </div>
    </div>
  );
}
