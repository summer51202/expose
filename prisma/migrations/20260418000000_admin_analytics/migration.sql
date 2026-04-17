CREATE TABLE "AnalyticsDailyMetric" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dateKey" TEXT NOT NULL,
    "pageType" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "AnalyticsDailyVisitor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dateKey" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "pageType" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "AnalyticsDailyMetric_dateKey_pageType_path_key" ON "AnalyticsDailyMetric"("dateKey", "pageType", "path");
CREATE INDEX "AnalyticsDailyMetric_dateKey_idx" ON "AnalyticsDailyMetric"("dateKey");
CREATE UNIQUE INDEX "AnalyticsDailyVisitor_dateKey_visitorId_pageType_path_key" ON "AnalyticsDailyVisitor"("dateKey", "visitorId", "pageType", "path");
CREATE INDEX "AnalyticsDailyVisitor_dateKey_idx" ON "AnalyticsDailyVisitor"("dateKey");
CREATE INDEX "AnalyticsDailyVisitor_visitorId_idx" ON "AnalyticsDailyVisitor"("visitorId");
