"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UpdatePresence = (patch: { micOn?: boolean }) => void;

/**
 * Requests the browser mic when unmuting and stops tracks when muting.
 * Exposes `localStream` for WebRTC (see useMeetingWebRTC).
 */
export function useMeetingMicrophone(
  micOn: boolean | undefined,
  updatePresence: UpdatePresence
) {
  const streamRef = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLocalStream(null);
  }, []);

  const setMuted = useCallback(() => {
    stopStream();
    updatePresence({ micOn: false });
  }, [stopStream, updatePresence]);

  const setUnmuted = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      stopStream();
      streamRef.current = stream;
      setLocalStream(stream);
      updatePresence({ micOn: true });
    } catch (e) {
      console.error("[meeting] Microphone permission failed:", e);
      updatePresence({ micOn: false });
    }
  }, [stopStream, updatePresence]);

  const toggleMic = useCallback(async () => {
    if (micOn) {
      setMuted();
    } else {
      await setUnmuted();
    }
  }, [micOn, setMuted, setUnmuted]);

  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  return { toggleMic, setMuted, localStream };
}
