"use client";

import { useMutation, useSelf } from "@liveblocks/react/suspense";
import { useState, type CSSProperties } from "react";
import type { TLRichText } from "@tldraw/tlschema";
import {
  createShapeId,
  Editor,
  renderPlaintextFromRichText,
  toRichText,
  type IndexKey,
  type TLDefaultColorStyle,
  type TLDefaultFillStyle,
  type TLGeoShapeGeoStyle,
  type TLShape,
  type TLShapeId,
} from "@tldraw/tldraw";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Props {
  editor: Editor;
}

type CanvasOperation = {
  tool: string;
  id?: string;
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  width?: number;
  height?: number;
  text?: string;
  label?: string;
  color?: string;
  fontSize?: number;
  bold?: boolean;
  from_id?: string;
  to_id?: string;
  geo?: string;
  fill?: string;
  name?: string;
};

type AgentChatResponse = {
  agent_text?: string;
  operations?: CanvasOperation[];
};

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

const NOTE_COLORS = new Set([
  "yellow",
  "pink",
  "blue",
  "green",
  "white",
  "light-blue",
  "orange",
  "red",
  "violet",
]);

function mapNoteColor(input: string | undefined): TLDefaultColorStyle {
  if (input && NOTE_COLORS.has(input)) return input as TLDefaultColorStyle;
  return "yellow";
}

/** Stroke / frame colors the agent may send (aligned with backend tools). */
const STROKE_COLORS = new Set<string>([
  "black",
  "blue",
  "green",
  "grey",
  "light-blue",
  "light-green",
  "light-red",
  "light-violet",
  "orange",
  "red",
  "violet",
  "yellow",
  "white",
  ...NOTE_COLORS,
]);

function mapStrokeColor(input: string | undefined): TLDefaultColorStyle {
  if (input && STROKE_COLORS.has(input)) return input as TLDefaultColorStyle;
  return "black";
}

const GEO_KINDS = new Set<string>([
  "rectangle",
  "ellipse",
  "triangle",
  "diamond",
  "cloud",
  "hexagon",
  "pentagon",
  "octagon",
  "star",
  "trapezoid",
  "oval",
  "heart",
  "rhombus",
  "rhombus-2",
  "arrow-up",
  "arrow-down",
  "arrow-left",
  "arrow-right",
  "check-box",
  "x-box",
]);

function mapGeoKind(input: string | undefined): TLGeoShapeGeoStyle {
  if (input && GEO_KINDS.has(input)) return input as TLGeoShapeGeoStyle;
  return "rectangle";
}

const FILL_STYLES = new Set<string>([
  "none",
  "solid",
  "semi",
  "pattern",
  "fill",
  "lined-fill",
]);

function mapFill(input: string | undefined): TLDefaultFillStyle {
  if (input && FILL_STYLES.has(input)) return input as TLDefaultFillStyle;
  return "none";
}

function fontSizeToTextSize(fs: number | undefined): "s" | "m" | "l" | "xl" {
  if (fs == null) return "m";
  if (fs <= 14) return "s";
  if (fs <= 20) return "m";
  if (fs <= 28) return "l";
  return "xl";
}

/** tldraw v4 exposes page bounds, not getViewportPageCenter(). */
function getViewportPageCenter(editor: Editor): { x: number; y: number } {
  const c = editor.getViewportPageBounds().center;
  return { x: c.x, y: c.y };
}

function shapeLabel(editor: Editor, shape: TLShape): string {
  const rt = (shape.props as { richText?: TLRichText }).richText;
  if (!rt) return "";
  return renderPlaintextFromRichText(editor, rt).trim();
}

function apiShapeType(shape: TLShape): string {
  switch (shape.type) {
    case "note":
      return "sticky_note";
    case "text":
      return "text";
    case "arrow":
      return "arrow";
    case "geo":
      return "geo";
    case "frame":
      return "frame";
    case "line":
      return "line";
    default:
      return shape.type;
  }
}

function finiteOr(n: number, fallback: number): number {
  return Number.isFinite(n) ? n : fallback;
}

function buildCanvasPayload(editor: Editor) {
  const bounds = editor.getViewportPageBounds();
  const shapes = editor.getCurrentPageShapes().map((s) => {
    const b = editor.getShapePageBounds(s);
    const label = shapeLabel(editor, s);
    const rawColor = (s.props as { color?: unknown }).color;
    const color = typeof rawColor === "string" ? rawColor : undefined;
    const entry: Record<string, unknown> = {
      id: String(s.id),
      type: apiShapeType(s),
      x: finiteOr(s.x, 0),
      y: finiteOr(s.y, 0),
    };
    if (label) entry.label = label;
    if (b && Number.isFinite(b.w) && Number.isFinite(b.h)) {
      entry.width = b.w;
      entry.height = b.h;
    }
    if (color) entry.color = color;
    if (s.type === "geo") {
      const gp = s.props as { geo?: string; fill?: string };
      if (gp.geo) entry.geo = gp.geo;
      if (gp.fill) entry.fill = gp.fill;
    }
    if (s.type === "frame") {
      const fp = s.props as { name?: string };
      if (fp.name) entry.name = fp.name;
    }
    return entry;
  });

  return {
    width: finiteOr(bounds.w, 1920),
    height: finiteOr(bounds.h, 1080),
    shapes,
  };
}

function safeShapeId(raw: string): TLShapeId {
  const safe = raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  return createShapeId(`ai_${safe || "node"}`);
}

function resolveShapeId(
  raw: string | undefined,
  idMap: Map<string, TLShapeId>,
  editor: Editor
): TLShapeId | null {
  if (!raw) return null;
  if (editor.getShape(raw as TLShapeId)) return raw as TLShapeId;
  const mapped = idMap.get(raw);
  if (mapped) return mapped;
  const prefixed = raw.startsWith("shape:") ? raw : `shape:${raw}`;
  if (editor.getShape(prefixed as TLShapeId)) return prefixed as TLShapeId;
  return null;
}

function applyAgentOperations(
  editor: Editor,
  operations: CanvasOperation[],
  pageCenter: { x: number; y: number }
) {
  const idMap = new Map<string, TLShapeId>();

  editor.run(() => {
    for (const op of operations) {
      switch (op.tool) {
        case "add_sticky_note": {
          const rawId =
            op.id ?? `note_${Math.random().toString(36).slice(2, 9)}`;
          const shapeId = safeShapeId(rawId);
          idMap.set(rawId, shapeId);

          editor.createShape({
            id: shapeId,
            type: "note",
            x: op.x ?? pageCenter.x,
            y: op.y ?? pageCenter.y,
            props: {
              color: mapNoteColor(op.color),
              richText: toRichText(op.text ?? ""),
            },
          });
          break;
        }
        case "add_text": {
          const rawId =
            op.id ?? `text_${Math.random().toString(36).slice(2, 9)}`;
          const shapeId = safeShapeId(rawId);
          idMap.set(rawId, shapeId);

          editor.createShape({
            id: shapeId,
            type: "text",
            x: op.x ?? pageCenter.x,
            y: op.y ?? pageCenter.y,
            props: {
              richText: toRichText(op.text ?? ""),
              size: fontSizeToTextSize(op.fontSize),
            },
          });
          break;
        }
        case "add_geo_shape": {
          const rawId =
            op.id ?? `geo_${Math.random().toString(36).slice(2, 9)}`;
          const shapeId = safeShapeId(rawId);
          idMap.set(rawId, shapeId);

          const w = finiteOr(op.width ?? 160, 160);
          const h = finiteOr(op.height ?? 120, 120);

          editor.createShape({
            id: shapeId,
            type: "geo",
            x: op.x ?? pageCenter.x,
            y: op.y ?? pageCenter.y,
            props: {
              geo: mapGeoKind(op.geo),
              w,
              h,
              color: mapStrokeColor(op.color),
              fill: mapFill(op.fill),
              richText: toRichText(op.text ?? ""),
            },
          });
          break;
        }
        case "add_frame": {
          const rawId =
            op.id ?? `frame_${Math.random().toString(36).slice(2, 9)}`;
          const shapeId = safeShapeId(rawId);
          idMap.set(rawId, shapeId);

          editor.createShape({
            id: shapeId,
            type: "frame",
            x: op.x ?? pageCenter.x,
            y: op.y ?? pageCenter.y,
            props: {
              w: finiteOr(op.width ?? 400, 400),
              h: finiteOr(op.height ?? 300, 300),
              name: op.name?.trim() || "Section",
              color: mapStrokeColor(op.color),
            },
          });
          break;
        }
        case "add_line": {
          const x1 = op.x1 ?? op.x;
          const y1 = op.y1 ?? op.y;
          const { x2, y2 } = op;
          if (
            x1 == null ||
            y1 == null ||
            x2 == null ||
            y2 == null ||
            !Number.isFinite(x1) ||
            !Number.isFinite(y1) ||
            !Number.isFinite(x2) ||
            !Number.isFinite(y2)
          ) {
            break;
          }
          const rawId =
            op.id ?? `line_${Math.random().toString(36).slice(2, 9)}`;
          const shapeId = safeShapeId(rawId);
          idMap.set(rawId, shapeId);

          editor.createShape({
            id: shapeId,
            type: "line",
            x: x1,
            y: y1,
            props: {
              color: mapStrokeColor(op.color),
              points: {
                a1: {
                  id: "a1",
                  index: "a1" as IndexKey,
                  x: 0,
                  y: 0,
                },
                a2: {
                  id: "a2",
                  index: "a2" as IndexKey,
                  x: x2 - x1,
                  y: y2 - y1,
                },
              },
            },
          });
          break;
        }
        case "add_arrow": {
          const fromId = resolveShapeId(op.from_id, idMap, editor);
          const toId = resolveShapeId(op.to_id, idMap, editor);
          if (!fromId || !toId) break;

          const fromB = editor.getShapePageBounds(fromId);
          const toB = editor.getShapePageBounds(toId);
          if (!fromB || !toB) break;

          const arrowId = createShapeId(
            `ai_arr_${Math.random().toString(36).slice(2, 10)}`
          );
          const mx = (fromB.midX + toB.midX) / 2;
          const my = (fromB.midY + toB.midY) / 2;

          editor.createShape({
            id: arrowId,
            type: "arrow",
            x: mx,
            y: my,
            props: {
              bend: 0,
              start: { x: 0, y: 0 },
              end: { x: 0, y: 0 },
              richText: toRichText(op.label ?? ""),
            },
          });

          editor.createBindings([
            {
              type: "arrow",
              fromId: arrowId,
              toId: fromId,
              props: {
                terminal: "start",
                normalizedAnchor: { x: 0.5, y: 0.5 },
                isExact: false,
                isPrecise: true,
                snap: "edge",
              },
            },
            {
              type: "arrow",
              fromId: arrowId,
              toId: toId,
              props: {
                terminal: "end",
                normalizedAnchor: { x: 0.5, y: 0.5 },
                isExact: false,
                isPrecise: true,
                snap: "edge",
              },
            },
          ]);
          break;
        }
        case "move_shape": {
          const sid = resolveShapeId(op.id, idMap, editor);
          if (!sid || op.x == null || op.y == null) break;
          const current = editor.getShape(sid);
          if (!current) break;
          editor.updateShape({
            id: sid,
            type: current.type,
            x: op.x,
            y: op.y,
          });
          break;
        }
        case "delete_shape": {
          const sid = resolveShapeId(op.id, idMap, editor);
          if (sid) editor.deleteShape(sid);
          break;
        }
        default:
          break;
      }
    }
  });
}

export default function AIActionMenu({ editor }: Props) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState("");
  /** Liveblocks `id` is optional for guests; backend requires a string `session_id`. */
  const sessionId = useSelf((me) =>
    typeof me.id === "string" && me.id.length > 0
      ? me.id
      : `liveblocks:${me.connectionId}`
  );

  const setAgentThinking = useMutation(
    ({ setMyPresence }, thinking: boolean) => {
      setMyPresence({ isAgentThinking: thinking });
    },
    []
  );

  const runDiagram = async () => {
    if (!prompt.trim()) return;
    setLoading("diagram");
    setAgentThinking(true);

    try {
      const viewportCenter = getViewportPageCenter(editor);
      const body = {
        session_id: sessionId,
        prompt: `Create or extend a diagram on the canvas (flowchart / mind map / connected ideas): ${prompt}`,
        canvas_state: buildCanvasPayload(editor),
      };

      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`API ${response.status}`);
      }

      const data = (await response.json()) as AgentChatResponse;
      if (data.operations?.length) {
        applyAgentOperations(editor, data.operations, viewportCenter);
      }
      if (data.agent_text) {
        console.info("[AI]", data.agent_text);
      }
    } catch (error) {
      console.error("AI diagram error:", error);
    } finally {
      setLoading("");
      setPrompt("");
      setAgentThinking(false);
    }
  };

  const runBrainstorm = async () => {
    if (!prompt.trim()) return;
    setLoading("brainstorm");
    setAgentThinking(true);

    try {
      const viewportCenter = getViewportPageCenter(editor);
      const body = {
        session_id: sessionId,
        prompt,
        canvas_state: buildCanvasPayload(editor),
      };

      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`API ${response.status}`);
      }

      const data = (await response.json()) as AgentChatResponse;
      if (data.operations?.length) {
        applyAgentOperations(editor, data.operations, viewportCenter);
      }
      if (data.agent_text) {
        console.info("[AI]", data.agent_text);
      }
    } catch (error) {
      console.error("AI brainstorm error:", error);
    } finally {
      setLoading("");
      setPrompt("");
      setAgentThinking(false);
    }
  };

  const busy = loading !== "";

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
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void runBrainstorm();
          }
        }}
      />
      <button
        type="button"
        onClick={() => void runDiagram()}
        disabled={busy}
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid #c7d2fe",
          fontWeight: 600,
          fontSize: 13,
          cursor: busy ? "not-allowed" : "pointer",
          background: busy ? "#f3f4f6" : "#eef2ff",
          color: busy ? "#9ca3af" : "#4338ca",
          pointerEvents: "auto",
        }}
        title="Схема: узлы и стрелки через ИИ"
      >
        {loading === "diagram" ? "…" : "Диаграмма"}
      </button>
      <button
        type="button"
        onClick={() => void runBrainstorm()}
        disabled={busy}
        style={{
          padding: "8px 16px",
          borderRadius: 8,
          border: "none",
          fontWeight: 600,
          fontSize: 14,
          cursor: busy ? "not-allowed" : "pointer",
          background: busy ? "#f3f4f6" : "#4f46e5",
          color: busy ? "#9ca3af" : "#fff",
          pointerEvents: "auto",
        }}
      >
        {loading === "brainstorm" ? "ИИ думает…" : "Brainstorm"}
      </button>
    </div>
  );
}
