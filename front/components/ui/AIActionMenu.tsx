"use client";

import { useMutation, useSelf } from "@liveblocks/react/suspense";
import { useCallback, useState, type CSSProperties } from "react";
import { useVoiceAgentDiagram } from "../../hooks/useVoiceAgentDiagram";
import { parseVoiceIntent } from "../../lib/voiceIntent";
import type { TLRichText } from "@tldraw/tlschema";
import {
  createShapeId,
  Editor,
  renderPlaintextFromRichText,
  toRichText,
  type IndexKey,
  type TLDefaultColorStyle,
  type TLDefaultDashStyle,
  type TLDefaultFillStyle,
  type TLDefaultSizeStyle,
  type TLGeoShapeGeoStyle,
  type TLShape,
  type TLShapeId,
} from "@tldraw/tldraw";
import { placeImageFromUrl } from "../../lib/placeImageOnCanvas";

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
  url?: string;
  points?: { x: number; y: number }[];
  steps?: { text: string; kind?: string }[];
  direction?: string;
  gap?: number;
  rows?: number;
  cols?: number;
  cell_width?: number;
  cell_height?: number;
  cells?: string[];
  header_row?: boolean;
  shape_ids?: string[];
  dash?: string;
  note_size?: string;
  bend?: number;
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

const DASH_STYLES = new Set<string>(["solid", "dashed", "dotted", "draw"]);

function mapDash(input: string | undefined): TLDefaultDashStyle {
  if (input && DASH_STYLES.has(input)) return input as TLDefaultDashStyle;
  return "solid";
}

function mapNoteSize(input: string | undefined): TLDefaultSizeStyle {
  if (input === "s" || input === "l" || input === "xl") return input;
  return "m";
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
    case "image":
      return "image";
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
    const label =
      s.type === "image" ? "[image]" : shapeLabel(editor, s);
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

function flowStepDims(kind: string | undefined): { w: number; h: number; geo: TLGeoShapeGeoStyle } {
  switch (kind) {
    case "diamond":
      return { w: 120, h: 120, geo: "diamond" };
    case "ellipse":
      return { w: 140, h: 88, geo: "ellipse" };
    default:
      return { w: 140, h: 72, geo: "rectangle" };
  }
}

function createArrowBetweenShapes(
  editor: Editor,
  fromId: TLShapeId,
  toId: TLShapeId,
  label: string
) {
  const fromB = editor.getShapePageBounds(fromId);
  const toB = editor.getShapePageBounds(toId);
  if (!fromB || !toB) return;

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
      richText: toRichText(label),
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
}

async function applyAgentOperations(
  editor: Editor,
  operations: CanvasOperation[],
  pageCenter: { x: number; y: number }
) {
  const idMap = new Map<string, TLShapeId>();
  const imageTasks: { url: string; x: number; y: number }[] = [];

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
              size: mapNoteSize(op.note_size),
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
              dash: mapDash(op.dash),
              spline: "line",
              size: "m",
              scale: 1,
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
          createArrowBetweenShapes(editor, fromId, toId, op.label ?? "");
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
        case "add_point_arrow": {
          const x1 = op.x1 ?? op.x;
          const y1 = op.y1 ?? op.y;
          const x2 = op.x2;
          const y2 = op.y2;
          if (
            x1 == null ||
            y1 == null ||
            x2 == null ||
            y2 == null ||
            !Number.isFinite(x1 + y1 + x2 + y2)
          ) {
            break;
          }
          const dx = x2 - x1;
          const dy = y2 - y1;
          const arrowId = createShapeId(
            `ai_ptarr_${Math.random().toString(36).slice(2, 10)}`
          );
          editor.createShape({
            id: arrowId,
            type: "arrow",
            x: x1,
            y: y1,
            props: {
              kind: "arc",
              labelColor: "black",
              color: mapStrokeColor(op.color),
              fill: "none",
              dash: "solid",
              size: "m",
              arrowheadStart: "none",
              arrowheadEnd: "arrow",
              font: "draw",
              start: { x: 0, y: 0 },
              end: { x: dx, y: dy },
              bend: finiteOr(op.bend ?? 0, 0),
              richText: toRichText(op.label ?? ""),
              labelPosition: 0.5,
              scale: 1,
              elbowMidPoint: 0.5,
            },
          });
          break;
        }
        case "add_polyline": {
          const pts = op.points;
          if (!Array.isArray(pts) || pts.length < 2) break;
          for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[i];
            const p1 = pts[i + 1];
            if (
              !p0 ||
              !p1 ||
              typeof p0.x !== "number" ||
              typeof p0.y !== "number" ||
              typeof p1.x !== "number" ||
              typeof p1.y !== "number"
            ) {
              continue;
            }
            const segId =
              op.id != null
                ? `${op.id}_seg_${i}`
                : `pline_${Math.random().toString(36).slice(2, 9)}_${i}`;
            const shapeId = safeShapeId(segId);
            idMap.set(segId, shapeId);
            const x1 = p0.x;
            const y1 = p0.y;
            const x2 = p1.x;
            const y2 = p1.y;
            editor.createShape({
              id: shapeId,
              type: "line",
              x: x1,
              y: y1,
              props: {
                color: mapStrokeColor(op.color),
                dash: mapDash(op.dash),
                spline: "line",
                size: "m",
                scale: 1,
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
          }
          break;
        }
        case "add_table": {
          const rows = Math.min(12, Math.max(1, Math.floor(op.rows ?? 1)));
          const cols = Math.min(12, Math.max(1, Math.floor(op.cols ?? 1)));
          const cw = finiteOr(op.cell_width ?? 120, 120);
          const ch = finiteOr(op.cell_height ?? 48, 48);
          const ox = op.x ?? pageCenter.x;
          const oy = op.y ?? pageCenter.y;
          let cells: string[] = Array.isArray(op.cells)
            ? op.cells.map((c) => String(c ?? ""))
            : [];
          const need = rows * cols;
          while (cells.length < need) cells.push("");
          if (cells.length > need) cells = cells.slice(0, need);

          const frameRaw = op.id ?? `tbl_${Math.random().toString(36).slice(2, 9)}`;
          const frameId = safeShapeId(frameRaw);
          idMap.set(frameRaw, frameId);
          const pad = 8;
          const titleH = 28;
          editor.createShape({
            id: frameId,
            type: "frame",
            x: ox,
            y: oy,
            props: {
              w: cols * cw + pad * 2,
              h: rows * ch + pad * 2 + titleH,
              name: op.name?.trim() || "Table",
              color: mapStrokeColor("grey"),
            },
          });

          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const idx = r * cols + c;
              const cellText = cells[idx] ?? "";
              const isHeader = op.header_row && r === 0;
              const cellRaw = `${frameRaw}_r${r}_c${c}`;
              const cellShapeId = safeShapeId(cellRaw);
              idMap.set(cellRaw, cellShapeId);
              editor.createShape({
                id: cellShapeId,
                type: "geo",
                x: ox + pad + c * cw,
                y: oy + pad + titleH + r * ch,
                props: {
                  geo: "rectangle",
                  w: cw - 4,
                  h: ch - 4,
                  color: "grey",
                  fill: isHeader ? "solid" : "semi",
                  richText: toRichText(cellText),
                },
              });
            }
          }
          break;
        }
        case "add_flow_sequence": {
          const steps = op.steps;
          if (!Array.isArray(steps) || steps.length === 0) break;
          const dir = op.direction === "horizontal" ? "horizontal" : "vertical";
          const gap = finiteOr(op.gap ?? 32, 32);
          let cx = op.x ?? pageCenter.x;
          let cy = op.y ?? pageCenter.y;
          const prefix = op.id ?? `flow_${Math.random().toString(36).slice(2, 9)}`;
          const shapeIds: TLShapeId[] = [];

          for (let i = 0; i < steps.length; i++) {
            const step = steps[i] as { text?: string; kind?: string };
            const text = String(step?.text ?? "");
            const { w, h, geo } = flowStepDims(step?.kind);
            const rawId = `${prefix}_s${i}`;
            const shapeId = safeShapeId(rawId);
            idMap.set(rawId, shapeId);
            shapeIds.push(shapeId);

            editor.createShape({
              id: shapeId,
              type: "geo",
              x: cx,
              y: cy,
              props: {
                geo,
                w,
                h,
                color: mapStrokeColor("blue"),
                fill: "semi",
                richText: toRichText(text),
              },
            });

            const b = editor.getShapePageBounds(shapeId);
            if (!b) break;
            if (dir === "vertical") {
              cy = b.maxY + gap;
            } else {
              cx = b.maxX + gap;
            }
          }

          for (let i = 0; i < shapeIds.length - 1; i++) {
            createArrowBetweenShapes(editor, shapeIds[i], shapeIds[i + 1], "");
          }
          break;
        }
        case "resize_shape": {
          const sid = resolveShapeId(op.id, idMap, editor);
          if (!sid) break;
          const sh = editor.getShape(sid);
          if (!sh) break;
          const nw = op.width;
          const nh = op.height;
          if (sh.type === "geo") {
            const p = sh.props as { w: number; h: number };
            editor.updateShape({
              id: sid,
              type: "geo",
              props: {
                w: nw != null ? finiteOr(nw, p.w) : p.w,
                h: nh != null ? finiteOr(nh, p.h) : p.h,
              },
            });
          } else if (sh.type === "frame") {
            const p = sh.props as { w: number; h: number };
            editor.updateShape({
              id: sid,
              type: "frame",
              props: {
                w: nw != null ? finiteOr(nw, p.w) : p.w,
                h: nh != null ? finiteOr(nh, p.h) : p.h,
              },
            });
          } else if (sh.type === "text") {
            const p = sh.props as { w: number };
            editor.updateShape({
              id: sid,
              type: "text",
              props: {
                w: nw != null ? finiteOr(nw, p.w) : p.w,
              },
            });
          } else if (sh.type === "note" && nw != null) {
            const s = finiteOr(nw, 200) / 200;
            editor.updateShape({
              id: sid,
              type: "note",
              props: {
                scale: Math.max(0.25, Math.min(4, s)),
              },
            });
          }
          break;
        }
        case "update_shape_text": {
          const sid = resolveShapeId(op.id, idMap, editor);
          if (!sid) break;
          const sh = editor.getShape(sid);
          if (!sh) break;
          const t = op.text ?? "";
          if (sh.type === "note" || sh.type === "text" || sh.type === "geo") {
            editor.updateShape({
              id: sid,
              type: sh.type,
              props: {
                richText: toRichText(t),
              },
            });
          }
          break;
        }
        case "group_shapes": {
          const raw = op.shape_ids;
          if (!Array.isArray(raw) || raw.length < 2) break;
          const ids = raw
            .map((r) => resolveShapeId(String(r), idMap, editor))
            .filter((id): id is TLShapeId => id != null);
          if (ids.length >= 2) {
            editor.groupShapes(ids);
          }
          break;
        }
        case "add_image_from_url": {
          const u = op.url?.trim();
          if (!u) break;
          imageTasks.push({
            url: u,
            x: op.x ?? pageCenter.x,
            y: op.y ?? pageCenter.y,
          });
          break;
        }
        default:
          break;
      }
    }
  });

  for (const task of imageTasks) {
    try {
      await placeImageFromUrl(editor, task.url, { x: task.x, y: task.y });
    } catch (e) {
      console.error("add_image_from_url:", e);
    }
  }
}

type ContributionMode = "light" | "normal" | "bold";

export default function AIActionMenu({ editor }: Props) {
  const [prompt, setPrompt] = useState("");
  const [agentFocus, setAgentFocus] = useState("");
  const [contributionMode, setContributionMode] =
    useState<ContributionMode>("normal");
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

  const runDiagramWithPrompt = useCallback(
    async (diagramPrompt: string) => {
      const p = diagramPrompt.trim();
      if (!p) return;
      setLoading("diagram");
      setAgentThinking(true);

      try {
        const viewportCenter = getViewportPageCenter(editor);
        const focus = agentFocus.trim();
        const body = {
          session_id: sessionId,
          prompt: `Create or extend a diagram on the canvas (flowchart / mind map / connected ideas): ${p}`,
          canvas_state: buildCanvasPayload(editor),
          ...(focus ? { agent_focus: focus } : {}),
          contribution_mode: contributionMode,
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
          await applyAgentOperations(editor, data.operations, viewportCenter);
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
    },
    [agentFocus, contributionMode, editor, sessionId, setAgentThinking]
  );

  const busy = loading !== "";

  const runBrainstormWithPrompt = useCallback(
    async (brainstormPrompt: string) => {
      const p = brainstormPrompt.trim();
      if (!p) return;
      setLoading("brainstorm");
      setAgentThinking(true);

      try {
        const viewportCenter = getViewportPageCenter(editor);
        const focus = agentFocus.trim();
        const body = {
          session_id: sessionId,
          prompt: p,
          canvas_state: buildCanvasPayload(editor),
          ...(focus ? { agent_focus: focus } : {}),
          contribution_mode: contributionMode,
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
          await applyAgentOperations(editor, data.operations, viewportCenter);
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
    },
    [agentFocus, contributionMode, editor, sessionId, setAgentThinking]
  );

  const runGenerateImage = useCallback(async () => {
    const p = prompt.trim();
    if (!p) return;
    setLoading("image");
    setAgentThinking(true);
    try {
      const viewportCenter = getViewportPageCenter(editor);
      const response = await fetch(`${API_BASE}/api/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: p,
          aspect_ratio: "16:9",
          resolution: "720p",
        }),
      });
      if (!response.ok) {
        throw new Error(`API ${response.status}`);
      }
      const data: unknown = await response.json();
      const url =
        typeof data === "string"
          ? data
          : (data as { url?: string }).url;
      if (!url) throw new Error("No image URL in response");
      await placeImageFromUrl(editor, url, viewportCenter);
    } catch (error) {
      console.error("Higgsfield image error:", error);
    } finally {
      setLoading("");
      setAgentThinking(false);
    }
  }, [editor, prompt, setAgentThinking]);

  const {
    listening: voiceListening,
    line: voiceLine,
    toggle: toggleVoice,
    startListening: startVoice,
    unsupported: voiceUnsupported,
    errorHint: voiceErrorHint,
  } = useVoiceAgentDiagram({
    onTranscript: setPrompt,
    onSessionEnd: (text) => {
      const intent = parseVoiceIntent(text);
      if (!intent) return;
      if (intent.kind === "diagram") {
        void runDiagramWithPrompt(intent.prompt);
      } else {
        void runBrainstormWithPrompt(intent.prompt);
      }
    },
    disabled: busy,
  });

  return (
    <div style={{ ...shell, flexDirection: "column", alignItems: "stretch", gap: 6 }}>
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="What should we brainstorm about?"
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
            void runBrainstormWithPrompt(prompt);
          }
        }}
      />
      <button
        type="button"
        className={voiceListening && !voiceUnsupported ? "voice-rec-btn--active" : undefined}
        onClick={() => {
          if (voiceListening) toggleVoice();
          else void startVoice(prompt);
        }}
        disabled={busy || voiceUnsupported}
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid #fcd34d",
          fontWeight: 600,
          fontSize: 13,
          cursor: busy || voiceUnsupported ? "not-allowed" : "pointer",
          background: voiceListening ? "#fef3c7" : busy || voiceUnsupported ? "#f3f4f6" : "#fffbeb",
          color: busy || voiceUnsupported ? "#9ca3af" : "#b45309",
          pointerEvents: "auto",
        }}
        title={
          voiceUnsupported
            ? "Speech recognition is not supported in this browser (try Chrome or Edge)."
            : "Speech fills the field. Stop records: say diagram / диаграмма / agent for Diagram, or brainstorm / брейншторм for Brainstorm — otherwise Brainstorm runs with your words."
        }
      >
        {voiceListening ? "⏹ Stop" : "🎤 Voice"}
      </button>
      <button
        type="button"
        onClick={() => void runDiagramWithPrompt(prompt)}
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
        title="Diagram: AI-generated nodes and arrows on the canvas"
      >
        {loading === "diagram" ? "…" : "Diagram"}
      </button>
      <button
        type="button"
        onClick={() => void runGenerateImage()}
        disabled={busy || !prompt.trim()}
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid #fbcfe8",
          fontWeight: 600,
          fontSize: 13,
          cursor: busy || !prompt.trim() ? "not-allowed" : "pointer",
          background:
            busy || !prompt.trim() ? "#f3f4f6" : "#fdf2f8",
          color: busy || !prompt.trim() ? "#9ca3af" : "#be185d",
          pointerEvents: "auto",
        }}
        title="Higgsfield: generate an image from the prompt and place it on the canvas"
      >
        {loading === "image" ? "…" : "AI image"}
      </button>
      <button
        type="button"
        onClick={() => void runBrainstormWithPrompt(prompt)}
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
        {loading === "brainstorm" ? "Thinking…" : "Brainstorm"}
      </button>
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "center",
          pointerEvents: "auto",
        }}
      >
        <input
          type="text"
          value={agentFocus}
          onChange={(e) => setAgentFocus(e.target.value)}
          placeholder="Optional focus for the agent (topic, constraints)"
          style={{
            flex: "1 1 220px",
            minWidth: 180,
            maxWidth: 360,
            padding: "6px 10px",
            fontSize: 12,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            outline: "none",
          }}
        />
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "#475569",
          }}
        >
          <span style={{ whiteSpace: "nowrap" }}>Contribution</span>
          <select
            value={contributionMode}
            onChange={(e) =>
              setContributionMode(e.target.value as ContributionMode)
            }
            style={{
              padding: "6px 8px",
              fontSize: 12,
              borderRadius: 6,
              border: "1px solid #e5e7eb",
              background: "#fff",
            }}
          >
            <option value="light">Light</option>
            <option value="normal">Normal</option>
            <option value="bold">Bold</option>
          </select>
        </label>
      </div>
      {(voiceListening || voiceLine || voiceErrorHint) && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            pointerEvents: "none",
          }}
        >
          {voiceListening && (
            <div className="voice-rec-bars" aria-hidden>
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          )}
          {voiceErrorHint ? (
            <div style={{ fontSize: 11, color: "#dc2626", maxWidth: 520, textAlign: "center" }}>
              {voiceErrorHint}
            </div>
          ) : (
            <div
              style={{
                fontSize: 11,
                color: "#64748b",
                maxWidth: 520,
                textAlign: "center",
                lineHeight: 1.35,
              }}
            >
              {voiceListening ? "Listening — " : ""}
              {voiceLine || (voiceListening ? "…" : "")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
