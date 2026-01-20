"use client";

import React, { useState } from "react";
import Sidebar from "../components/Sidebar";

export default function TestPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarPosition, setSidebarPosition] = useState<"left" | "right">("right");

  return (
    <div className="min-h-screen bg-background p-8 text-text">
      <h1 className="mb-6 text-3xl font-bold">Sidebar Component Test</h1>
      
      <div className="space-y-4">
        <div className="flex gap-4">
          <button
            onClick={() => {
              setSidebarPosition("right");
              setIsSidebarOpen(true);
            }}
            className="rounded bg-primary px-4 py-2 font-bold text-white hover:bg-primary/90"
          >
            Open Right Sidebar
          </button>
          
          <button
            onClick={() => {
              setSidebarPosition("left");
              setIsSidebarOpen(true);
            }}
            className="rounded bg-secondary px-4 py-2 font-bold text-white hover:bg-secondary/90"
          >
            Open Left Sidebar
          </button>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="mb-4 text-xl font-semibold">Page Content</h2>
          <p className="mb-4 text-text-muted">
            This is some dummy content to test the sidebar overlay and scrolling behavior.
            When the sidebar is open, the background should be dimmed and scrolling should be disabled.
          </p>
          {Array.from({ length: 5 }).map((_, i) => (
            <p key={i} className="mb-4 text-text-muted">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
          ))}
        </div>
      </div>

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        title="Test Sidebar"
        position={sidebarPosition}
      >
        <div className="space-y-4">
          <p>This is the content of the sidebar.</p>
          <div className="rounded bg-surface p-4">
            <h3 className="font-semibold">Section 1</h3>
            <p className="text-sm text-text-muted">Some details here.</p>
          </div>
          <div className="rounded bg-surface p-4">
            <h3 className="font-semibold">Section 2</h3>
            <p className="text-sm text-text-muted">More details here.</p>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="w-full rounded border border-border px-4 py-2 hover:bg-surface"
          >
            Close Sidebar
          </button>
          
          {Array.from({ length: 10 }).map((_, i) => (
            <p key={i} className="text-sm text-text-muted">
              Scrolling content inside sidebar... {i + 1}
            </p>
          ))}
        </div>
      </Sidebar>
    </div>
  );
}
