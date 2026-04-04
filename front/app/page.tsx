import { Room } from "./Room";
import { Flow } from "./Flow";

export default function Home() {
  return (
    // Делаем контейнер на весь экран, чтобы холст занял всё пространство
    <main style={{ width: "100vw", height: "100vh" }}>
      <Room>
        <Flow />
      </Room>
    </main>
  );
}