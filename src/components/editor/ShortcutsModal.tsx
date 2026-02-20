"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: "Space", desc: "Play / Pause" },
  { key: "[", desc: "Seek back 1 second" },
  { key: "]", desc: "Seek forward 1 second" },
  { key: "R", desc: "Restart to beginning" },
  { key: "E", desc: "Open Export modal" },
  { key: "?", desc: "Show this help" },
  { key: "⌘Z / Ctrl+Z", desc: "Undo" },
  { key: "⌘⇧Z / Ctrl+Shift+Z", desc: "Redo" },
  { key: "Esc", desc: "Close modal" },
];

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <table className="w-full text-xs font-mono">
          <tbody>
            {SHORTCUTS.map(({ key, desc }) => (
              <tr key={key} className="border-b border-border/30 last:border-0">
                <td className="py-1.5 pr-4 w-36">
                  <kbd className="inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {key}
                  </kbd>
                </td>
                <td className="py-1.5 text-muted-foreground">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DialogContent>
    </Dialog>
  );
}
