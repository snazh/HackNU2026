"use client";

import {
  useEventListener,
  useOthers,
  useRoom,
  useSelf,
} from "@liveblocks/react/suspense";
import type { JsonObject } from "@liveblocks/core";
import { useCallback, useEffect, useRef, useState } from "react";

type Signal =
  | {
      wb: "rtc-v1";
      kind: "offer";
      from: number;
      to: number;
      sdp: string;
    }
  | {
      wb: "rtc-v1";
      kind: "answer";
      from: number;
      to: number;
      sdp: string;
    }
  | {
      wb: "rtc-v1";
      kind: "ice";
      from: number;
      to: number;
      cand: RTCIceCandidateInit | null;
    };

function isSignal(x: unknown): x is Signal {
  if (typeof x !== "object" || x === null) return false;

  const obj = x as Partial<Signal>;

  if (obj.wb !== "rtc-v1") return false;
  if (typeof obj.from !== "number") return false;
  if (typeof obj.to !== "number") return false;

  if (obj.kind === "offer" || obj.kind === "answer") {
    return typeof obj.sdp === "string";
  }

  if (obj.kind === "ice") {
    return "cand" in obj;
  }

  return false;
}

const ICE: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

function shouldInitiate(myConnectionId: number, peerConnectionId: number): boolean {
  return myConnectionId < peerConnectionId;
}

/**
 * Mesh WebRTC audio: hear others in the room; send mic when `localStream` is set and `micOn`.
 * Signaling uses Liveblocks `broadcastEvent`.
 */
export function useMeetingWebRTC(opts: {
  micOn: boolean;
  localStream: MediaStream | null;
}) {
  const room = useRoom();
  const self = useSelf();
  const others = useOthers();
  const myId = self?.connectionId;

  const [remoteStreams, setRemoteStreams] = useState<Record<number, MediaStream>>({});

  const peersRef = useRef<Map<number, RTCPeerConnection>>(new Map());
  const pendingIceRef = useRef<Map<number, RTCIceCandidateInit[]>>(new Map());
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const broadcast = useCallback(
    (msg: Signal) => {
      room.broadcastEvent(msg as JsonObject);
    },
    [room]
  );

  const flushPendingIce = useCallback(async (peerId: number, pc: RTCPeerConnection) => {
    const list = pendingIceRef.current.get(peerId);
    if (!list?.length) return;

    pendingIceRef.current.delete(peerId);

    for (const cand of list) {
      try {
        if (cand.candidate != null || cand.sdpMid != null) {
          await pc.addIceCandidate(cand);
        }
      } catch (e) {
        console.warn("[webrtc] addIceCandidate failed", e);
      }
    }
  }, []);

  const removePeer = useCallback((peerId: number) => {
    const pc = peersRef.current.get(peerId);
    if (pc) {
      pc.close();
      peersRef.current.delete(peerId);
    }

    pendingIceRef.current.delete(peerId);

    setRemoteStreams((prev) => {
      if (!(peerId in prev)) return prev;
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  }, []);

  const attachLocal = useCallback((pc: RTCPeerConnection) => {
    const { micOn, localStream } = optsRef.current;
    const track = micOn && localStream ? (localStream.getAudioTracks()[0] ?? null) : null;

    const audioSender = pc.getSenders().find((s) => s.track?.kind === "audio");

    if (audioSender) {
      void audioSender.replaceTrack(track);
    } else if (track && localStream) {
      pc.addTrack(track, localStream);
    }
  }, []);

  const sendOffer = useCallback(
    async (peerId: number, pc: RTCPeerConnection) => {
      if (myId === undefined) return;
      if (!shouldInitiate(myId, peerId)) return;
      if (pc.signalingState !== "stable") return;

      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
        });
        await pc.setLocalDescription(offer);

        broadcast({
          wb: "rtc-v1",
          kind: "offer",
          from: myId,
          to: peerId,
          sdp: offer.sdp ?? "",
        });
      } catch (e) {
        console.warn("[webrtc] createOffer failed", e);
      }
    },
    [broadcast, myId]
  );

  const createPeer = useCallback(
    (peerId: number) => {
      const existing = peersRef.current.get(peerId);
      if (existing) return existing;

      const pc = new RTCPeerConnection(ICE);

      if (myId !== undefined && shouldInitiate(myId, peerId)) {
        pc.addTransceiver("audio", { direction: "sendrecv" });
      }

      pc.ontrack = (ev) => {
        const stream = ev.streams[0] ?? (ev.track ? new MediaStream([ev.track]) : null);
        if (stream) {
          setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
        }
      };

      pc.onicecandidate = (ev) => {
        if (myId === undefined) return;
        if (!ev.candidate) return;

        broadcast({
          wb: "rtc-v1",
          kind: "ice",
          from: myId,
          to: peerId,
          cand: ev.candidate.toJSON(),
        });
      };

      peersRef.current.set(peerId, pc);
      return pc;
    },
    [broadcast, myId]
  );

  useEffect(() => {
    if (myId === undefined) return;

    const wanted = new Set(
      others.map((o) => o.connectionId).filter((id) => id !== myId)
    );

    for (const id of peersRef.current.keys()) {
      if (!wanted.has(id)) {
        removePeer(id);
      }
    }

    for (const peerId of wanted) {
      const pc = createPeer(peerId);
      attachLocal(pc);
      void sendOffer(peerId, pc);
    }
  }, [
    others,
    myId,
    createPeer,
    attachLocal,
    sendOffer,
    removePeer,
    opts.micOn,
    opts.localStream,
  ]);

  useEventListener(
    useCallback(
      ({ event }: { event: unknown }) => {
        if (myId === undefined || !isSignal(event)) return;
        if (event.to !== myId) return;

        void (async () => {
          if (event.kind === "ice") {
            const pc = peersRef.current.get(event.from);

            if (!pc) {
              if (event.cand) {
                const list = pendingIceRef.current.get(event.from) ?? [];
                list.push(event.cand);
                pendingIceRef.current.set(event.from, list);
              }
              return;
            }

            if (!event.cand) return;

            try {
              if (pc.remoteDescription) {
                await pc.addIceCandidate(event.cand);
              } else {
                const list = pendingIceRef.current.get(event.from) ?? [];
                list.push(event.cand);
                pendingIceRef.current.set(event.from, list);
              }
            } catch (e) {
              console.warn("[webrtc] incoming ice failed", e);
            }

            return;
          }

          const pc = createPeer(event.from);

          if (event.kind === "offer") {
            try {
              await pc.setRemoteDescription({ type: "offer", sdp: event.sdp });
              await flushPendingIce(event.from, pc);
              attachLocal(pc);

              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);

              broadcast({
                wb: "rtc-v1",
                kind: "answer",
                from: myId,
                to: event.from,
                sdp: answer.sdp ?? "",
              });
            } catch (e) {
              console.warn("[webrtc] handle offer failed", e);
            }

            return;
          }

          if (event.kind === "answer") {
            try {
              await pc.setRemoteDescription({ type: "answer", sdp: event.sdp });
              await flushPendingIce(event.from, pc);
            } catch (e) {
              console.warn("[webrtc] handle answer failed", e);
            }
          }
        })();
      },
      [myId, broadcast, createPeer, attachLocal, flushPendingIce]
    )
  );

  useEffect(() => {
    return () => {
      for (const id of peersRef.current.keys()) {
        removePeer(id);
      }
    };
  }, [removePeer]);

  return { remoteStreams };
}