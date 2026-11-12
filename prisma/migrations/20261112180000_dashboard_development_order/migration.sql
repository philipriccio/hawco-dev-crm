-- Shared dashboard-only ordering. Project rows and Slate order remain untouched.
CREATE TABLE "DashboardDevelopmentOrder" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "projectIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT "DashboardDevelopmentOrder_singleton" CHECK ("id" = 'active-development'),
  CONSTRAINT "DashboardDevelopmentOrder_array" CHECK (jsonb_typeof("projectIds") = 'array')
);
INSERT INTO "DashboardDevelopmentOrder" ("id", "projectIds")
SELECT 'active-development', COALESCE(jsonb_agg("id" ORDER BY "updatedAt" DESC, "id" ASC), '[]'::jsonb)
FROM "Project" WHERE "status"::text IN ('EARLY_DEVELOPMENT', 'DEVELOPING', 'PACKAGING', 'PITCHED', 'DEVELOPING_WITH_NETWORK', 'GREENLIT');
