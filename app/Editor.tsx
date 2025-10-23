"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactQuill from "react-quill-new";
import Quill, { Delta } from "quill";
import { createNote, updateNote, getNote, sendNote } from "./lib/actions";
import "react-quill-new/dist/quill.snow.css";
import webSocket from "./lib/socket";

export default function Editor() {
  const [value, setValue] = useState("");
  const [isRealtime, setIsRealtime] = useState(true);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const quillRef = useRef<ReactQuill | null>(null);
  // store last-saved delta to avoid redundant saves
  const lastDeltaRef = useRef<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const waitTime = 200;
  const timeout = useRef<NodeJS.Timeout | number | null>(null);
  const deltaBufferRef = useRef<Delta>(new Delta());

  const handleTextChange = useCallback(
    (delta: Delta, oldDelta: Delta, source: string) => {
      if (source !== "user") {
        return;
      }
      debounceSend(delta);
    },
    []
  );

  function debounceSend(delta: Delta) {
    if (timeout.current !== null) {
      clearTimeout(timeout.current);
    }

    deltaBufferRef.current = deltaBufferRef.current.compose(delta);

    timeout.current = setTimeout(() => {
      const payload = JSON.stringify(deltaBufferRef.current);
      webSocket.send(payload);
      deltaBufferRef.current = new Delta();
    }, waitTime);
  }

  useEffect(() => {
    if (!quillRef.current) {
      return;
    }
    const editor: Quill = quillRef.current.getEditor();
    editor.on("text-change", handleTextChange);
    return () => {
      editor.off("text-change", handleTextChange);
    };
  }, [handleTextChange, quillRef]);

  useEffect(() => {
    async function fetchNote() {
      if (await createNote()) {
        const result = await getNote();
        if (result?.note?.content) {
          setValue(result.note.content);
        }
      }
    }

    fetchNote();
  }, []);

  useEffect(() => {
    async function handleMessage(event: MessageEvent) {
      if (!quillRef.current) {
        return;
      }

      const blob: Blob = event.data;
      const message = await blob.text();

      const delta: unknown = JSON.parse(message);

      if (!isValidQuillDelta(delta)) {
        return;
      }
      const editor = quillRef.current.getEditor();

      editor.updateContents(new Delta(delta), "api");
    }
    webSocket.addEventListener("message", handleMessage);
    return () => webSocket.removeEventListener("message", handleMessage);
  }, []);

  function isValidQuillDelta(data: unknown): data is Delta {
    return Array.isArray((data as Delta)?.ops);
  }

  const save = useCallback(async () => {
    const editor = quillRef.current?.getEditor();
    const delta = editor?.getContents();
    if (!delta) return;

    const serialized = JSON.stringify(delta);
    // avoid sending unchanged content repeatedly
    if (lastDeltaRef.current === serialized) return;

    setSaveStatus("saving");

    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = isRealtime
          ? await sendNote(serialized)
          : await updateNote(serialized);
        if (result?.success) {
          lastDeltaRef.current = serialized;
          setLastSavedAt(Date.now());
          setSaveStatus("saved");
          return;
        }
        // if result indicates failure, throw to enter retry/backoff
        throw new Error("updateNote returned failure");
      } catch (err) {
        if (attempt < maxRetries) {
          // exponential-ish backoff
          await sleep(300 * attempt);
          continue;
        }
        setSaveStatus("error");
        console.error("Failed to save note after retries", err);
      }
    }
  }, [isRealtime]);

  return (
    <div className="w-full p-4 md:p-30 flex flex-col gap-4">
      <div className="flex justify-start gap-4">
        <button
          onClick={() => setIsReadOnly((prev) => !prev)}
          className="p-2 border rounded-lg hover:bg-emerald-950"
        >
          {isReadOnly ? "Switch to Edit Mode" : "Switch to Read-Only Mode"}
        </button>

        <button
          onClick={() => setIsRealtime((prev) => !prev)}
          className="p-2 border rounded-lg hover:bg-emerald-950"
        >
          {isRealtime
            ? "Turn off Real-time collaboration"
            : "Turn on Realtime collaboration"}
        </button>

        <div className="flex items-center text-sm text-gray-400 ml-2">
          {saveStatus === "saving" && <span>Saving…</span>}
          {saveStatus === "error" && (
            <span className="text-red-500">Error saving</span>
          )}
          {saveStatus === "saved" && lastSavedAt && (
            <span>Saved at {new Date(lastSavedAt).toLocaleTimeString()}</span>
          )}
          {saveStatus === "idle" && !lastSavedAt && <span>Not saved yet</span>}
        </div>
      </div>

      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={setValue}
        readOnly={isReadOnly}
        placeholder="Start writing..."
        modules={{
          toolbar: true,
        }}
      />
    </div>
  );
}
