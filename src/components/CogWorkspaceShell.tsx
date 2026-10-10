import { ReactNode } from "react";


interface CogWorkspaceShellProps {
  titleContent: ReactNode;
  actionContent: ReactNode;
  metadataContent?: ReactNode;
  actionRowContent?: ReactNode;
  children: ReactNode;
}

export function CogWorkspaceShell({
  titleContent,
  actionContent,
  metadataContent,
  actionRowContent,
  children,
}: CogWorkspaceShellProps) {
  return (
    <div className="flex flex-col pt-4 px-4 sm:px-8 bg-background w-full max-w-[var(--page-content-max-width)] mx-auto flex-1 min-h-0 overflow-hidden">
      {/* FIXED HEADER AREA */}
      <div className="shrink-0 bg-background z-10 flex flex-col gap-2 pb-4 border-b border-border">
        {/* ROW 1: Actions */}
        {actionRowContent && (
          <div className="w-full">
            {actionRowContent}
          </div>
        )}

        {/* ROW 2: Title and Actions */}
        {(titleContent || actionContent) && (
          <div className="flex items-center gap-4 w-full">
            <div className={actionContent ? "w-[80%] flex items-center min-w-0" : "w-full flex items-center min-w-0"}>
              {titleContent}
            </div>
            {actionContent && (
              <div className="w-[20%] flex items-center justify-end min-w-0">
                {actionContent}
              </div>
            )}
          </div>
        )}

        {/* ROW 3: Metadata */}
        {metadataContent && (
          <div className="w-full text-xs text-muted-foreground">
            {metadataContent}
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
