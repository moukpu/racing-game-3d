"use client";

import dynamic from "next/dynamic";

const Scene = dynamic(() => import("./scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm uppercase tracking-widest text-white/60">
      Loading game…
    </div>
  ),
});

export default function GameRoot() {
  return <Scene />;
}
