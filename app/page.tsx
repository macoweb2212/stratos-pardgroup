"use client";

import InteractiveAvatar from "@/components/InteractiveAvatar";
export default function App() {

  return (
    <div className="w-screen h-screen flex flex-col">
      <div className="size-full flex flex-col items-start justify-start gap-5 mx-auto pt-4 pb-20">
        <div className="size-full">
          <InteractiveAvatar />
        </div>
      </div>
    </div>
  );
}
