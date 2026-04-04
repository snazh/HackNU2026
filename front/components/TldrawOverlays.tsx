"use client";

import { useEditor } from "@tldraw/tldraw";
import AIAvatar from "./AIAvatar";
import AIActionMenu from "./ui/AIActionMenu";

export function TldrawOverlays() {
  const editor = useEditor();
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 200,
      }}
    >
      <AIAvatar />
      <AIActionMenu editor={editor} />
    </div>
  );
}
