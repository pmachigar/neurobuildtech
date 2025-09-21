"use client";
import dynamic from "next/dynamic";

const RemoteExample = dynamic(() => import("./RemoteExample"), { ssr: false });

export default function RemoteExampleClient() {
  return <RemoteExample />;
}
