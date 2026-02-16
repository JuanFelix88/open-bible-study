"use client";

import React, { useState } from "react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import AppleIcon from "./icons/AppleIcon";
import AndroidIcon from "./icons/AndroidIcon";
import CheckIcon from "./icons/CheckIcon";
import ShareIcon from "./icons/ShareIcon";
import AddIcon from "./icons/AddIcon";
import Image from "next/image";

interface InstallPageProps {
  title: string;
  description: string;
  iosButtonText: string;
  androidButtonText: string;
  installedText: string;
  iosInstructions: {
    step1: string;
    step2: string;
    step3: string;
  };
}

export default function InstallPage({
  title,
  description,
  iosButtonText,
  androidButtonText,
  installedText,
  iosInstructions,
}: InstallPageProps) {
  const { isInstalled, isIOS, canInstall, install } = usePWAInstall();
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  const handleIOSClick = () => {
    setShowIOSInstructions(!showIOSInstructions);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-surface p-8 shadow-xl ring-1 ring-border">
        <div className="space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-surface text-white shadow-lg overflow-hidden">
            <Image
              src="/manifest-icons/icon-192.png"
              alt="App Icon"
              width={80}
              height={80}
              className="h-full w-full object-cover"
            />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-text">
            {title}
          </h1>
          <p className="text-lg text-text-muted">{description}</p>
        </div>

        <div className="space-y-4 pt-4">
          {/* Android / Desktop Install Button */}
          {!isIOS && (
            <div className="space-y-2">
              <button
                onClick={install}
                disabled={isInstalled || !canInstall}
                className={`flex w-full items-center justify-center gap-3 rounded-xl px-6 py-4 text-lg font-semibold transition-all ${
                  isInstalled
                    ? "cursor-default bg-success text-white"
                    : canInstall
                      ? "bg-text text-background hover:bg-text-muted hover:scale-[1.02] active:scale-[0.98]"
                      : "cursor-not-allowed bg-surface-strong text-text-muted opacity-50"
                }`}
              >
                {isInstalled ? (
                  <>
                    <CheckIcon className="h-6 w-6" />
                    {installedText}
                  </>
                ) : (
                  <>
                    <AndroidIcon className="h-6 w-6" />
                    {androidButtonText}
                  </>
                )}
              </button>
              {!isInstalled && !canInstall && (
                <p className="text-sm text-text-muted">
                  {/* Fallback message if install prompt is not available */}
                  (Open in Chrome to install)
                </p>
              )}
            </div>
          )}

          {/* iOS Install Button / Instructions */}
          {isIOS && (
            <div className="space-y-4">
              <button
                onClick={handleIOSClick}
                disabled={isInstalled}
                className={`flex w-full items-center justify-center gap-3 rounded-xl px-6 py-4 text-lg font-semibold transition-all ${
                  isInstalled
                    ? "cursor-default bg-success text-white"
                    : "bg-text text-background hover:bg-text-muted hover:scale-[1.02] active:scale-[0.98]"
                }`}
              >
                {isInstalled ? (
                  <>
                    <CheckIcon className="h-6 w-6" />
                    {installedText}
                  </>
                ) : (
                  <>
                    <AppleIcon className="h-6 w-6" />
                    {iosButtonText}
                  </>
                )}
              </button>

              {showIOSInstructions && !isInstalled && (
                <div className="animate-fade-in-from-bottom rounded-xl bg-surface-strong p-4 text-left text-text shadow-inner">
                  <ol className="space-y-4">
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                        1
                      </span>
                      <span className="flex-1">
                        {iosInstructions.step1}{" "}
                        <ShareIcon className="inline h-5 w-5 text-primary" />
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                        2
                      </span>
                      <span className="flex-1">{iosInstructions.step2}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                        3
                      </span>
                      <span className="flex-1">
                        {iosInstructions.step3}{" "}
                        <AddIcon className="inline h-5 w-5 text-primary" />
                      </span>
                    </li>
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
