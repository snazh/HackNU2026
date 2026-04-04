"use client"; // Обязательно, так как здесь много браузерной логики

import { Tldraw } from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css"; // Обязательно импортируем стили холста
import { LiveblocksProvider, RoomProvider, ClientSideSuspense } from "@liveblocks/react/suspense";

// F1: Здесь мы будем скрывать лишний UI (пока просто заглушка)
const components = {
  // Например, позже раскомментируем это, чтобы убрать тулбар
  // Toolbar: null, 
};

export function CanvasApp() {
  return (
    // 1. Инициализируем Liveblocks (вставь свой ключ из дашборда)
    <LiveblocksProvider publicApiKey="твой_ключ_pk_...">
      
      {/* // 2. Подключаемся к комнате. Все, кто введет этот id, окажутся на одном холсте */}
      <RoomProvider id="hackathon-ai-brainstorm-room">
        
        // 3. Показываем лоадер, пока устанавливается WebSocket соединение
        <ClientSideSuspense fallback={<div className="flex w-full h-full items-center justify-center">Подключение к комнате...</div>}>
          
          {/* 4. Сам холст Tldraw */}
          <div style={{ width: '100vw', height: '100vh' }}>
            <Tldraw 
              components={components}
              inferDarkMode // Опционально: подстраивается под тему системы
              onMount={(editor) => {
                // Важный хак для хакатона: сохраняем editor в глобальный объект (window),
                // чтобы Frontend 2 (парсер) мог легко получить к нему доступ из любого места
                (window as any).tldrawEditor = editor;
                console.log("Tldraw смонтирован, editor сохранен в window");
              }}
            />
          </div>

        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}