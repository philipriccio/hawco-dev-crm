-- Seed starter genre tag vocabulary and migrate existing project.genre strings to ProjectTag rows.
-- Keep Project.genre as a legacy/search/display string until tag migration is verified in production.

INSERT INTO "Tag" ("id", "name", "category", "color")
SELECT 'genre-' || slug, slug, 'genre', '#7c3aed'
FROM (VALUES
  ('drama'), ('comedy'), ('comedy-drama'), ('thriller'), ('crime'), ('procedural'), ('mystery'), ('sci-fi'),
  ('fantasy'), ('horror'), ('supernatural'), ('family'), ('teen'), ('historical'), ('period'), ('anthology'),
  ('limited-series'), ('workplace'), ('ensemble'), ('romance'), ('action'), ('adventure'), ('true-crime'), ('docudrama')
) AS starter(slug)
ON CONFLICT ("name") DO UPDATE SET "category" = 'genre', "color" = COALESCE("Tag"."color", '#7c3aed');

WITH mapped AS (
  SELECT p."id" AS "projectId", tag_name
  FROM "Project" p
  CROSS JOIN LATERAL (
    SELECT unnest(CASE lower(trim(p."genre"))
      WHEN 'comedy' THEN ARRAY['comedy']
      WHEN 'drama' THEN ARRAY['drama']
      WHEN 'crime' THEN ARRAY['crime']
      WHEN 'thriller' THEN ARRAY['thriller']
      WHEN 'procedural' THEN ARRAY['procedural']
      WHEN 'crime/mystery' THEN ARRAY['crime','mystery']
      WHEN '½ hour comedy' THEN ARRAY['comedy']
      WHEN '1 hour drama' THEN ARRAY['drama']
      ELSE regexp_split_to_array(lower(regexp_replace(regexp_replace(trim(coalesce(p."genre", '')), '[^A-Za-z0-9,/ _-]+', '', 'g'), '[ _]+', '-', 'g')), '\s*[,/]\s*')
    END) AS tag_name
  ) tags
  WHERE p."genre" IS NOT NULL AND trim(p."genre") <> '' AND tag_name <> ''
), ensured_tags AS (
  INSERT INTO "Tag" ("id", "name", "category", "color")
  SELECT DISTINCT 'genre-' || tag_name, tag_name, 'genre', '#7c3aed'
  FROM mapped
  ON CONFLICT ("name") DO UPDATE SET "category" = 'genre', "color" = COALESCE("Tag"."color", '#7c3aed')
  RETURNING "id", "name"
), all_genre_tags AS (
  SELECT "id", "name" FROM ensured_tags
  UNION
  SELECT "id", "name" FROM "Tag" WHERE "category" = 'genre'
)
INSERT INTO "ProjectTag" ("id", "projectId", "tagId")
SELECT 'pt-' || mapped."projectId" || '-' || all_genre_tags."id", mapped."projectId", all_genre_tags."id"
FROM mapped
JOIN all_genre_tags ON all_genre_tags."name" = mapped.tag_name
ON CONFLICT ("projectId", "tagId") DO NOTHING;

UPDATE "Project" SET "format" = '½ Hour' WHERE "format" IS NULL AND lower(trim("genre")) = '½ hour comedy';
UPDATE "Project" SET "format" = '1 Hour' WHERE "format" IS NULL AND lower(trim("genre")) = '1 hour drama';
