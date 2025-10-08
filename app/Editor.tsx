'use client';

import dynamic from "next/dynamic";
import { useState, useRef } from "react";
import type ReactQuillType from "react-quill-new";
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

  function save() {
    const editor = quillRef.current?.getEditor();
    const delta = editor?.getContents();
    console.log(delta);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
      <button
        onClick={() => setIsReadOnly((prev) => !prev)}
        className="p-2 border rounded-lg hover:bg-emerald-950"
      >
        {isReadOnly ? "Switch to Edit Mode" : "Switch to Read-Only Mode"}
      </button>
      <button onClick={() => save() } className="p-2 border rounded-lg hover:bg-emerald-950">Save</button>
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
