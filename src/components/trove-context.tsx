"use client";
import { createContext, useContext } from "react";
import type { Capabilities, Offer, UserView } from "@/lib/types";
export type AppState = {
  offers: Offer[];
  user: UserView | null;
  capabilities: Capabilities;
  refresh: () => Promise<void>;
  notify: (message: string, error?: boolean) => void;
  ensureAuth: () => Promise<boolean>;
};
export const AppContext = createContext<AppState | null>(null);
export const useTrove = () => useContext(AppContext)!;
