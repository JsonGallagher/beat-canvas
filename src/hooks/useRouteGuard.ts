"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/lib/state/projectStore";
import { hasAudio } from "@/lib/state/selectors";

type Guard = "audio";

export function useRouteGuard(requires: Guard[]) {
  const router = useRouter();
  const state = useProjectStore();

  useEffect(() => {
    for (const guard of requires) {
      if (guard === "audio" && !hasAudio(state)) {
        router.replace("/");
        return;
      }
    }
  }, [requires, state, router]);
}
