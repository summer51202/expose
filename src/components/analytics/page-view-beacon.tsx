"use client";

import { useEffect, useRef } from "react";

import type { AnalyticsPageType } from "@/types/analytics";

type PageViewBeaconProps = {
  pageType: AnalyticsPageType;
  path: string;
};

export function PageViewBeacon({ pageType, path }: PageViewBeaconProps) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) {
      return;
    }

    sentRef.current = true;
    void fetch("/api/analytics/page-view", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ pageType, path }),
      keepalive: true,
    }).catch(() => {});
  }, [pageType, path]);

  return null;
}
