import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";
import type { Item, Tag } from "./types";

type CatalogValue = {
  items: Item[];
  tags: Tag[];
  dailyWheel: number[];
  ready: boolean;
};

const CatalogContext = createContext<CatalogValue>({ items: [], tags: [], dailyWheel: [], ready: false });

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [dailyWheel, setDailyWheel] = useState<number[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void api.get<{ items: Item[]; tags: Tag[]; dailyWheel: number[] }>("/catalog").then((r) => {
      setItems(r.items);
      setTags(r.tags);
      setDailyWheel(r.dailyWheel);
      setReady(true);
    }).catch(() => setReady(true));
  }, []);

  return <CatalogContext.Provider value={{ items, tags, dailyWheel, ready }}>{children}</CatalogContext.Provider>;
}

export function useCatalog() { return useContext(CatalogContext); }
