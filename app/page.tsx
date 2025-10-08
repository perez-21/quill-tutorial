import Image from "next/image";
import Editor from "./Editor";

export default function Home() {
  return (
    <div className="font-sans flex flex-col items-center justify-items-center min-w-screen min-h-screen p-8">
        <Editor/>

    </div>
  );
}
