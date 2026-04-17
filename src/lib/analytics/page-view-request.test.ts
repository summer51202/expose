import assert from "node:assert/strict";
import test from "node:test";

import { parseAnalyticsPageViewRequest } from "./page-view-request";

test("parseAnalyticsPageViewRequest accepts known page view payloads", () => {
  assert.deepEqual(
    parseAnalyticsPageViewRequest({
      pageType: "album",
      path: "/albums/travel",
    }),
    {
      pageType: "album",
      path: "/albums/travel",
    },
  );
});

test("parseAnalyticsPageViewRequest rejects unknown page types and external paths", () => {
  assert.equal(
    parseAnalyticsPageViewRequest({
      pageType: "admin",
      path: "/admin",
    }),
    null,
  );
  assert.equal(
    parseAnalyticsPageViewRequest({
      pageType: "home",
      path: "https://example.com/",
    }),
    null,
  );
});
