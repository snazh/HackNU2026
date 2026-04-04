import { CollaborativeCanvas } from "../components/CollaborativeCanvas";
import { Room } from "./Room";

export default function Home() {
  return (
    <main style={{ width: "100vw", height: "100vh" }}>
      <Room>
        <CollaborativeCanvas />
      </Room>
    </main>
  );
}