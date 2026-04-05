import Link from "next/link";
import { CollaborativeCanvas } from "../components/CollaborativeCanvas";
import { Room } from "./Room";

export default function Home() {
  return (
    <main style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <Link
        href="/meet"
        style={{
          position: "absolute",
          top: 12,
          right: 14,
          zIndex: 998,
          padding: "8px 14px",
          borderRadius: 10,
          background: "rgba(15,23,42,0.85)",
          color: "#e2e8f0",
          fontSize: 13,
          fontWeight: 600,
          textDecoration: "none",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        Group meeting canvas →
      </Link>
      <Room>
        <CollaborativeCanvas />
      </Room>
    </main>
  );
}