"use client";

import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/browser";
import {
  buildCurrentUserFromSession,
  type CurrentUser,
} from "@/lib/auth/current-user";

export type CurrentUserSnapshot =
  | { status: "loading"; user: null }
  | { status: "anonymous"; user: null }
  | { status: "authenticated"; user: CurrentUser };

const loadingSnapshot: CurrentUserSnapshot = {
  status: "loading",
  user: null,
};

let snapshot: CurrentUserSnapshot = loadingSnapshot;
let initialized = false;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function setSnapshot(nextSnapshot: CurrentUserSnapshot) {
  snapshot = nextSnapshot;
  emitChange();
}

function setSnapshotFromSession(
  session: Session | null
) {
  const user = buildCurrentUserFromSession(session);

  setSnapshot(
    user
      ? { status: "authenticated", user }
      : { status: "anonymous", user: null }
  );
}

function initializeCurrentUserStore() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  const supabase = createClient();

  const refreshCurrentUser = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSnapshotFromSession(session);
    } catch (error) {
      console.error("Failed to load current user", error);
      setSnapshot({ status: "anonymous", user: null });
    }
  };

  void refreshCurrentUser();

  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    void refreshCurrentUser();
  });

  window.addEventListener("popstate", () => {
    void refreshCurrentUser();
  });

  supabase.auth.onAuthStateChange(
    (_event: AuthChangeEvent, session: Session | null) => {
    setSnapshotFromSession(session);
    }
  );
}

function subscribe(listener: () => void) {
  initializeCurrentUserStore();
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return loadingSnapshot;
}

export function useCurrentUser() {
  const currentSnapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  return currentSnapshot.status === "authenticated"
    ? currentSnapshot.user
    : null;
}

export function useCurrentUserSnapshot() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useIsAdmin() {
  const currentUser = useCurrentUser();
  return currentUser?.isAdmin ?? false;
}
