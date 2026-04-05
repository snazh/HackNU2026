"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as typeof window & {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  };
  return w.webkitSpeechRecognition ?? w.SpeechRecognition ?? null;
}

async function ensureMicrophonePermission(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("getUserMedia not available");
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((t) => t.stop());
}

type UseVoiceInputOpts = {
  /** Live transcript (final + interim) — bind to your text field. */
  onTranscript: (display: string) => void;
  /** Called when the user stops voice (or recognition ends). Pass to intent + API. */
  onSessionEnd: (fullText: string) => void;
  disabled: boolean;
  /** BCP-47, e.g. en-US, ru-RU */
  lang?: string;
};

/**
 * Speech-to-text: streams text via `onTranscript`; on Stop, `onSessionEnd` receives the full line.
 */
export function useVoiceAgentDiagram({
  onTranscript,
  onSessionEnd,
  disabled,
  lang,
}: UseVoiceInputOpts) {
  const resolvedLang =
    lang ??
    process.env.NEXT_PUBLIC_VOICE_AGENT_LANG ??
    (typeof navigator !== "undefined" && navigator.language
      ? navigator.language
      : "en-US");

  const [listening, setListening] = useState(false);
  const [line, setLine] = useState("");
  const [unsupported, setUnsupported] = useState(false);
  const [errorHint, setErrorHint] = useState("");

  const recRef = useRef<SpeechRecognition | null>(null);
  const shouldRunRef = useRef(false);
  const bufRef = useRef("");
  const lastInterimRef = useRef("");
  const onTranscriptRef = useRef(onTranscript);
  const onSessionEndRef = useRef(onSessionEnd);
  const langRef = useRef(resolvedLang);
  onTranscriptRef.current = onTranscript;
  onSessionEndRef.current = onSessionEnd;
  langRef.current = resolvedLang;

  useEffect(() => {
    if (getSpeechRecognitionCtor() === null) setUnsupported(true);
  }, []);

  const stop = useCallback(() => {
    const finals = bufRef.current.trim();
    const interim = lastInterimRef.current.trim();
    const combined = [finals, interim].filter(Boolean).join(" ").trim();

    shouldRunRef.current = false;
    const r = recRef.current;
    if (r) {
      r.onend = null;
      r.onerror = null;
      r.onresult = null;
      try {
        r.abort();
      } catch {
        try {
          r.stop();
        } catch {
          /* ignore */
        }
      }
      recRef.current = null;
    }

    bufRef.current = "";
    lastInterimRef.current = "";
    setListening(false);
    setLine("");
    setErrorHint("");

    if (combined) {
      onSessionEndRef.current(combined);
    }
  }, []);

  const startOneRecognition = useCallback(
    (Ctor: new () => SpeechRecognition) => {
      const rec = new Ctor();
      rec.lang = langRef.current;
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onresult = (event: SpeechRecognitionEvent) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            bufRef.current = (bufRef.current + " " + chunk).trim();
          } else {
            interim += chunk;
          }
        }
        lastInterimRef.current = interim;
        const display = (
          bufRef.current +
          (interim ? (bufRef.current ? " " : "") + interim : "")
        ).trim();
        setLine(display);
        onTranscriptRef.current(display);
      };

      rec.onerror = (ev: SpeechRecognitionErrorEvent) => {
        if (ev.error === "aborted") return;
        if (ev.error === "no-speech") return;
        if (ev.error === "not-allowed") {
          setErrorHint("Allow microphone in the browser address bar.");
          shouldRunRef.current = false;
          bufRef.current = "";
          lastInterimRef.current = "";
          setListening(false);
          setLine("");
          return;
        }
        if (ev.error === "service-not-allowed" || ev.error === "network") {
          setErrorHint("Speech service unavailable — use Chrome/Edge over HTTPS.");
        }
        console.warn("[voice]", ev.error);
      };

      rec.onend = () => {
        recRef.current = null;
        if (!shouldRunRef.current) {
          setListening(false);
          return;
        }
        queueMicrotask(() => {
          if (!shouldRunRef.current) {
            setListening(false);
            return;
          }
          try {
            const NextCtor = getSpeechRecognitionCtor();
            if (!NextCtor) {
              shouldRunRef.current = false;
              setListening(false);
              return;
            }
            const next = startOneRecognition(NextCtor);
            recRef.current = next;
            next.start();
          } catch (e) {
            console.warn("[voice] restart failed", e);
            shouldRunRef.current = false;
            setListening(false);
          }
        });
      };

      return rec;
    },
    []
  );

  const startListening = useCallback(
    async (seedText = "") => {
      if (disabled) return;
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) {
        setUnsupported(true);
        return;
      }
      const seed = seedText.trim();
      bufRef.current = seed;
      lastInterimRef.current = "";
      setLine(seed);
      onTranscriptRef.current(seed);

      const r = recRef.current;
      if (r) {
        try {
          r.abort();
        } catch {
          /* ignore */
        }
        recRef.current = null;
      }

      setErrorHint("");
      try {
        await ensureMicrophonePermission();
      } catch {
        setErrorHint("Microphone permission is required for voice.");
        return;
      }

      shouldRunRef.current = true;
      try {
        const rec = startOneRecognition(Ctor);
        recRef.current = rec;
        rec.start();
        setListening(true);
        setUnsupported(false);
      } catch (e) {
        console.warn("[voice] start failed", e);
        shouldRunRef.current = false;
        setListening(false);
        setErrorHint("Could not start speech recognition.");
      }
    },
    [disabled, startOneRecognition]
  );

  const toggle = useCallback(() => {
    if (listening) {
      stop();
      return;
    }
    void startListening("");
  }, [listening, startListening, stop]);

  useEffect(() => () => {
    shouldRunRef.current = false;
    const r = recRef.current;
    if (r) {
      try {
        r.abort();
      } catch {
        /* ignore */
      }
      recRef.current = null;
    }
  }, []);

  return { listening, line, toggle, startListening, unsupported, stop, errorHint };
}
