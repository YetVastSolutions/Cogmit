import { ReactNode } from "react";


interface CogWorkspaceShellProps {
  titleContent: ReactNode;
  actionContent: ReactNode;
  metadataContent?: ReactNode;
  actionRowContent?: ReactNode;
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
  actionRowContent,
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

        {/* ROW 3: Actions */}
        {actionRowContent ? (
          <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full">
            {actionRowContent}
          </div>
        ) : (
          <div className="flex w-full items-center justify-between gap-[3.33%]">
            <div className="w-[25%] min-w-0">{control1Content}</div>
            <div className="w-[25%] min-w-0">{control2Content}</div>
            <div className="w-[20%] min-w-0">{control3Content}</div>
            <div className="w-[20%] min-w-0">{control4Content}</div>
          </div>
        )}
      </div>

      {/* SCROLLABLE CONTENT AREA */}
      <div className="flex-1 overflow-y-auto min-h-0 py-6">
        {children}
      </div>
    </div>
  );
}
