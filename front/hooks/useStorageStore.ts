"use client";

import type { Json, LiveMap } from "@liveblocks/client";
import { useEffect, useRef, useState } from "react";
import { useRoom } from "@liveblocks/react/suspense";
import {
  computed,
  createPresenceStateDerivation,
  createTLStore,
  defaultShapeUtils,
  DocumentRecordType,
  InstancePresenceRecordType,
  PageRecordType,
  react,
  type IndexKey,
  type TLAnyShapeUtilConstructor,
  type TLDocument,
  type TLInstancePresence,
  type TLPageId,
  type TLRecord,
  type TLStoreEventInfo,
  type TLStoreWithStatus,
} from "@tldraw/tldraw";

const STORAGE_WAIT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`${label} — превышено ${ms} мс`)), ms);
    promise.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      }
    );
  });
}

export function useStorageStore({
  shapeUtils = [],
  user,
}: Partial<{
  shapeUtils: TLAnyShapeUtilConstructor[];
  user: {
    id: string;
    color: string;
    name: string;
  };
}>) {
  const room = useRoom();
  const isApplyingLiveblocksStorage = useRef(false);

  const userId = user?.id ?? "";
  const userColor = user?.color ?? "#e879f9";
  const userName = user?.name ?? "Guest";

  const [store] = useState(() =>
    createTLStore({
      shapeUtils: [...defaultShapeUtils, ...shapeUtils],
    })
  );

  const [storeWithStatus, setStoreWithStatus] = useState<TLStoreWithStatus>({
    status: "loading",
  });

  useEffect(() => {
    let cancelled = false;
    const unsubs: (() => void)[] = [];

    function finishLocal() {
      if (cancelled) return;
      setStoreWithStatus({
        store,
        status: "synced-local",
      });
    }

    function finishRemote() {
      if (cancelled) return;
      setStoreWithStatus({
        store,
        status: "synced-remote",
        connectionStatus: "online",
      });
    }

    async function setup() {
      let liveRecords: LiveMap<string, Json> | null = null;

      try {
        const { root } = await withTimeout(
          room.getStorage(),
          STORAGE_WAIT_MS,
          "Liveblocks Storage"
        );
        const map = root.get("records");
        if (!map) {
          throw new Error("В Storage нет ключа `records` — проверь схему в дашборде Liveblocks.");
        }
        liveRecords = map;
      } catch (e) {
        console.warn(
          "[useStorageStore] Совместная доска недоступна, работаем локально:",
          e
        );
        finishLocal();
        return;
      }

      if (cancelled) return;

      try {
        store.mergeRemoteChanges(() => {
          const documentIds = store
            .allRecords()
            .filter((record) => store.scopedTypes.document.has(record.typeName))
            .map((r) => r.id);

          if (documentIds.length > 0) {
            store.remove(documentIds);
          }

          store.put(
            [
              DocumentRecordType.create({
                id: "document:document" as TLDocument["id"],
              }),
              PageRecordType.create({
                id: "page:page" as TLPageId,
                name: "Page 1",
                index: "a1" as IndexKey,
              }),
              ...[...liveRecords!.values()].map((r) => r as unknown as TLRecord),
            ],
            "initialize"
          );
        });
      } catch (e) {
        console.warn("[useStorageStore] Ошибка инициализации доски из Storage:", e);
        finishLocal();
        return;
      }

      if (cancelled) return;

      unsubs.push(
        store.listen(
          ({ changes }: TLStoreEventInfo) => {
            if (isApplyingLiveblocksStorage.current) return;
            room.batch(() => {
              Object.values(changes.added).forEach((record) => {
                liveRecords!.set(record.id, record as unknown as Json);
              });

              Object.values(changes.updated).forEach(([, record]) => {
                liveRecords!.set(record.id, record as unknown as Json);
              });

              Object.values(changes.removed).forEach((record) => {
                liveRecords!.delete(record.id);
              });
            });
          },
          { source: "user", scope: "document" }
        )
      );

      function syncStoreWithPresence({ changes }: TLStoreEventInfo) {
        room.batch(() => {
          Object.values(changes.added).forEach((record) => {
            room.updatePresence({
              [record.id]: record as unknown as Json,
            });
          });

          Object.values(changes.updated).forEach(([, record]) => {
            room.updatePresence({
              [record.id]: record as unknown as Json,
            });
          });

          Object.values(changes.removed).forEach((record) => {
            room.updatePresence({ [record.id]: null });
          });
        });
      }

      unsubs.push(
        store.listen(syncStoreWithPresence, {
          source: "user",
          scope: "session",
        })
      );

      unsubs.push(
        store.listen(syncStoreWithPresence, {
          source: "user",
          scope: "presence",
        })
      );

      unsubs.push(
        room.subscribe(
          liveRecords,
          (storageChanges) => {
            const toRemove: TLRecord["id"][] = [];
            const toPut: TLRecord[] = [];

            for (const update of storageChanges) {
              if (update.type !== "LiveMap") {
                return;
              }

              for (const [id, { type }] of Object.entries(update.updates)) {
                switch (type) {
                  case "delete": {
                    toRemove.push(id as TLRecord["id"]);
                    break;
                  }
                  case "update": {
                    const curr = update.node.get(id);
                    if (curr) {
                      toPut.push(curr as unknown as TLRecord);
                    }
                    break;
                  }
                }
              }
            }

            if (toRemove.length === 0 && toPut.length === 0) return;

            isApplyingLiveblocksStorage.current = true;
            try {
              store.mergeRemoteChanges(() => {
                if (toRemove.length) {
                  store.remove(toRemove);
                }
                if (toPut.length) {
                  store.put(toPut);
                }
              });
            } finally {
              isApplyingLiveblocksStorage.current = false;
            }
          },
          { isDeep: true }
        )
      );

      const userPreferences = computed<{
        id: string;
        color: string;
        name: string;
      }>("userPreferences", () => ({
        id: userId,
        color: userColor,
        name: userName,
      }));

      const connectionIdString = String(room.getSelf()?.connectionId ?? 0);

      const presenceDerivation = createPresenceStateDerivation(
        userPreferences,
        InstancePresenceRecordType.createId(connectionIdString)
      )(store);

      room.updatePresence({
        presence: (presenceDerivation.get() ?? null) as unknown as Json | null,
      });

      unsubs.push(
        react("when presence changes", () => {
          const presence = presenceDerivation.get() ?? null;
          requestAnimationFrame(() => {
            room.updatePresence({
              presence: presence as unknown as Json | null,
            });
          });
        })
      );

      unsubs.push(
        room.subscribe("others", (others, event) => {
          const toRemove: TLInstancePresence["id"][] = [];
          const toPut: TLInstancePresence[] = [];

          switch (event.type) {
            case "leave": {
              if (event.user.connectionId) {
                toRemove.push(
                  InstancePresenceRecordType.createId(
                    `${event.user.connectionId}`
                  )
                );
              }
              break;
            }
            case "reset": {
              others.forEach((other) => {
                toRemove.push(
                  InstancePresenceRecordType.createId(`${other.connectionId}`)
                );
              });
              break;
            }
            case "enter":
            case "update": {
              const presence = event?.user?.presence;
              if (
                presence &&
                typeof presence === "object" &&
                "presence" in presence &&
                presence.presence
              ) {
                toPut.push(presence.presence as unknown as TLInstancePresence);
              }
            }
          }

          store.mergeRemoteChanges(() => {
            if (toRemove.length) {
              store.remove(toRemove);
            }
            if (toPut.length) {
              store.put(toPut);
            }
          });
        })
      );

      finishRemote();
    }

    void setup();

    return () => {
      cancelled = true;
      unsubs.forEach((fn) => fn());
      unsubs.length = 0;
    };
  }, [room, store, userId, userColor, userName]);

  return storeWithStatus;
}
