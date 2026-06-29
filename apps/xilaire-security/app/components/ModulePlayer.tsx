// apps/xilaire-security/app/components/ModulePlayer.tsx
"use client";

import { useEffect, useRef } from "react";
import { useModuleProgress } from "../lib/hooks/useModuleProgress";

type ModulePlayerProps = {
  module_id: string;
  src: string;
};

export default function ModulePlayer({ module_id, src }: ModulePlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const { watchedSeconds, watchedPercent, updateTime, markComplete } =
    useModuleProgress(module_id);

  // When we have saved progress, try to resume the video there
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Only seek if we actually have progress and we're not already near it
    if (
      watchedSeconds > 0 &&
      Math.abs(video.currentTime - watchedSeconds) > 1
    ) {
      try {
        video.currentTime = watchedSeconds;
      } catch (err) {
        console.warn("Unable to seek video to saved position:", err);
      }
    }
  }, [watchedSeconds]);

  return (
    <div className="space-y-2">
      <video
        ref={videoRef}
        src={src}
        controls
        className="w-full rounded-lg"
        onTimeUpdate={(e) => {
          const vid = e.currentTarget;
          const cur = vid.currentTime || 0;
          const dur = vid.duration || 0;

          // Avoid NaN / infinity when duration is not known yet
          if (!dur || !isFinite(dur)) return;

          const pct = Math.min(100, (cur / dur) * 100);
          updateTime(cur, pct);
        }}
        onEnded={() => {
          // When the video finishes, make sure we mark it complete
          markComplete();
        }}
      />

      <div className="text-sm opacity-70">
        Saved: {Math.max(0, Math.floor(watchedSeconds))}s •{" "}
        {Math.max(0, Math.floor(watchedPercent))}%
      </div>
    </div>
  );
}
