"use client";

interface WorkspaceLayoutProps {
  header: React.ReactNode;
  leftPanel: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  bottomBar: React.ReactNode;
}

export function WorkspaceLayout({
  header,
  leftPanel,
  centerPanel,
  rightPanel,
  bottomBar,
}: WorkspaceLayoutProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--surface-0)]">
      {/* Header */}
      <div className="panel flex-none border-b border-[var(--border-dim)]">{header}</div>

      {/* Main 3-panel layout */}
      <div className="grid flex-1 grid-cols-[280px_1fr_280px] overflow-hidden">
        {/* Left panel */}
        <div className="panel flex flex-col overflow-y-auto border-r border-[var(--border-dim)]">
          {leftPanel}
        </div>

        {/* Center preview */}
        <div className="flex items-center justify-center bg-black">
          {centerPanel}
        </div>

        {/* Right panel */}
        <div className="panel flex flex-col overflow-y-auto border-l border-[var(--border-dim)]">
          {rightPanel}
        </div>
      </div>

      {/* Bottom transport bar */}
      <div className="panel flex-none border-t border-[var(--border-dim)]">{bottomBar}</div>
    </div>
  );
}
