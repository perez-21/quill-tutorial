'use client';

import dynamic from "next/dynamic";
import { useState, useRef, useEffect, useCallback } from "react";
import type ReactQuillType from "react-quill-new";
import { createNote, updateNote, getNote } from "./lib/actions";
import "react-quill-new/dist/quill.snow.css";

// Dynamically import ReactQuill (no SSR)
const ReactQuill = dynamic(async () => {
  const { default: RQ } = await import("react-quill-new");
  return RQ;
}, { ssr: false }) as unknown as typeof ReactQuillType; 

export default function Editor() {
  const [value, setValue] = useState("");
  const [isReadOnly, setIsReadOnly] = useState(false);
  const quillRef = useRef<ReactQuillType | null>(null);
  // store last-saved delta to avoid redundant saves
  const lastDeltaRef = useRef<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle'|'saving'|'saved'|'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  useEffect(() => {
    async function fetchNote() {
      if (await createNote()){
        const result = await getNote();
        if (result?.note?.content) {
          setValue(result.note.content);
        }
      }
      
    }

    fetchNote();

  }, []);

  const save = useCallback(async () => {
    const editor = quillRef.current?.getEditor();
    const delta = editor?.getContents();
    if (!delta) return;

    const serialized = JSON.stringify(delta);
    // avoid sending unchanged content repeatedly
    if (lastDeltaRef.current === serialized) return;

    setSaveStatus('saving');

    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await updateNote(serialized);
        if (result?.success) {
          lastDeltaRef.current = serialized;
          setLastSavedAt(Date.now());
          setSaveStatus('saved');
          return;
        }
        // if result indicates failure, throw to enter retry/backoff
        throw new Error('updateNote returned failure');
      } catch (err) {
        if (attempt < maxRetries) {
          // exponential-ish backoff
          await sleep(300 * attempt);
          continue;
        }
        setSaveStatus('error');
        console.error('Failed to save note after retries', err);
      }
    }
  }, []);

  // Autosave every 20 seconds; clean up on unmount
  useEffect(() => {
    const id = setInterval(() => {
      // fire-and-forget; save handles its own errors/retries
      void save();
    }, 20_000);

    return () => clearInterval(id);
  }, [save]);

  return (
    <div className="w-full p-4 md:p-30 flex flex-col gap-4">
      <div className="flex justify-start gap-4">
      <button
        onClick={() => setIsReadOnly((prev) => !prev)}
        className="p-2 border rounded-lg hover:bg-emerald-950"
      >
        {isReadOnly ? "Switch to Edit Mode" : "Switch to Read-Only Mode"}
      </button>
      <button onClick={() => { void save(); }} className="p-2 border rounded-lg hover:bg-emerald-950">Save</button>

      <div className="flex items-center text-sm text-gray-400 ml-2">
        {saveStatus === 'saving' && <span>Saving…</span>}
        {saveStatus === 'error' && <span className="text-red-500">Error saving</span>}
        {saveStatus === 'saved' && lastSavedAt && (
          <span>Saved at {new Date(lastSavedAt).toLocaleTimeString()}</span>
        )}
        {saveStatus === 'idle' && !lastSavedAt && <span>Not saved yet</span>}
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
          toolbar: true
        }}
      />
    </div>
  );
}
