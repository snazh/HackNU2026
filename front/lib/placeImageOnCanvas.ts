import type { Editor } from "@tldraw/tldraw";

/**
 * Drop an image onto the page as a first-class tldraw image shape (movable asset).
 * Uses same-origin proxy when needed so Higgsfield URLs work without browser CORS issues.
 */
export async function placeImageFromUrl(
  editor: Editor,
  imageUrl: string,
  point: { x: number; y: number }
): Promise<void> {
  let blob: Blob;
  let contentType = "image/png";

  try {
    const direct = await fetch(imageUrl, { mode: "cors" });
    if (direct.ok) {
      blob = await direct.blob();
      contentType = direct.headers.get("content-type") || blob.type || contentType;
    } else {
      throw new Error(`HTTP ${direct.status}`);
    }
  } catch {
    const proxy = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
    const proxied = await fetch(proxy);
    if (!proxied.ok) {
      throw new Error(`Could not load image (${proxied.status})`);
    }
    blob = await proxied.blob();
    contentType = proxied.headers.get("content-type") || blob.type || contentType;
  }

  const ext =
    contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const file = new File([blob], `canvas.${ext}`, { type: contentType || "image/png" });

  await editor.putExternalContent({
    type: "files",
    files: [file],
    point,
  });
}
