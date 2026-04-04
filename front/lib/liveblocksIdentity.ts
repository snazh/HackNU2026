const STORAGE_KEY = "lb-meeting-identity-v1";

export type LiveblocksStoredIdentity = {
  userId: string;
  name: string;
  color: string;
};

function randomHexColor(): string {
  const n = Math.floor(Math.random() * 0xffffff);
  return `#${n.toString(16).padStart(6, "0")}`;
}

/**
 * Stable per-browser identity for Liveblocks auth (same tabs / reloads share one logical user).
 */
export function getOrCreateLiveblocksIdentity(): LiveblocksStoredIdentity {
  if (typeof window === "undefined") {
    return {
      userId: "ssr-placeholder",
      name: "Guest",
      color: "#6366f1",
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LiveblocksStoredIdentity>;
      if (
        typeof parsed.userId === "string" &&
        parsed.userId.length > 0 &&
        typeof parsed.name === "string" &&
        typeof parsed.color === "string"
      ) {
        return {
          userId: parsed.userId,
          name: parsed.name,
          color: parsed.color,
        };
      }
    }
    const id = crypto.randomUUID();
    const name = `Guest ${id.slice(0, 4)}`;
    const color = randomHexColor();
    const next: LiveblocksStoredIdentity = { userId: id, name, color };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    const fallback = crypto.randomUUID();
    return {
      userId: fallback,
      name: "Guest",
      color: "#6366f1",
    };
  }
}
