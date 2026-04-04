import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

// 1. Создаем клиента (ключ пока можно оставить таким для теста)
const client = createClient({
  publicApiKey: "pk_prod_test_key", 
});

// 2. Настраиваем "комнату"
export const {
  RoomProvider,
  useOthers,
  useMutation, // ВОТ ЭТА ШТУКА ДОЛЖНА БЫТЬ ТУТ
  useMyPresence,
} = createRoomContext(client);