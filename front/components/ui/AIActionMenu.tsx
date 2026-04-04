"use client";

import { useMutation } from "@liveblocks/react/suspense";
import { useState, type CSSProperties } from "react";
import { Editor, createShapeId } from "@tldraw/tldraw";

const API_BASE =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")
    : "http://localhost:8000";

interface Props {
  editor: Editor;
}

const shell: CSSProperties = {
  position: "absolute",
  bottom: 32,
  left: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  gap: 8,
  alignItems: "center",
  background: "#fff",
  padding: "10px 12px",
  borderRadius: 12,
  boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
  border: "1px solid #e5e7eb",
  zIndex: 10,
  pointerEvents: "none",
};

export default function AIActionMenu({ editor }: Props) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const setAgentThinking = useMutation(
    ({ setMyPresence }, thinking: boolean) => {
      setMyPresence({ isAgentThinking: thinking });
    },
    []
  );

  const handleIdentifyContext = () => {
    const shapes = editor.getCurrentPageShapes();
    return shapes
      .map((s) => ({
        id: s.id,
        type: s.type,
        text: (s.props as { text?: string }).text || "",
        x: s.x,
        y: s.y,
      }))
      .filter((s) => s.text.length > 0);
  };

  const askAI = async () => {
    if (!prompt) return;
    setLoading(true);
    setAgentThinking(true);

    try {
      const context = handleIdentifyContext();

      const response = await fetch(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, context }),
      });

      if (!response.ok) {
        throw new Error(`API ${response.status}`);
      }

      const data = await response.json();

      if (data.suggestions) {
        editor.createShapes(
          data.suggestions.map((s: { x?: number; y?: number; text?: string }) => ({
            id: createShapeId(),
            type: "geo",
            x: s.x ?? editor.getViewportScreenCenter().x,
            y: s.y ?? editor.getViewportScreenCenter().y,
            props: {
              geo: "rectangle",
              color: "blue",
              text: s.text ?? "",
            },
          }))
        );
      }
    } catch (error) {
      console.error("AI Error:", error);
    } finally {
      setLoading(false);
      setPrompt("");
      setAgentThinking(false);
    }
  };

  return (
    <div style={shell}>
      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="О чём брейнштормим?…"
        style={{
          width: 280,
          padding: "8px 12px",
          fontSize: 14,
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          outline: "none",
          pointerEvents: "auto",
        }}
        onKeyDown={(e) => e.key === "Enter" && askAI()}
      />
      <button
        type="button"
        onClick={askAI}
        disabled={loading}
        style={{
          padding: "8px 16px",
          borderRadius: 8,
          border: "none",
          fontWeight: 600,
          fontSize: 14,
          cursor: loading ? "not-allowed" : "pointer",
          background: loading ? "#f3f4f6" : "#4f46e5",
          color: loading ? "#9ca3af" : "#fff",
          pointerEvents: "auto",
        }}
      >
        {loading ? "ИИ думает…" : "Brainstorm"}
      </button>
    </div>
  );
}
