CREATE TYPE "SlateFormat" AS ENUM ('HALF_HOUR_COMEDY', 'ONE_HOUR_DRAMA', 'LIMITED_SERIES', 'FEATURE');
CREATE TYPE "NarrativeEngine" AS ENUM ('SERIALIZED', 'EPISODIC');
CREATE TYPE "SlateGenre" AS ENUM ('COMEDY', 'DARK_COMEDY', 'CRIME_AND_MYSTERY', 'THRILLER', 'SOAP_AND_RELATIONSHIP_DRAMA', 'ROMANCE', 'FAMILY_DRAMA', 'WORKPLACE_DRAMA', 'YOUNG_ADULT');
CREATE TYPE "PipelineStage" AS ENUM ('SOURCING', 'NEGOTIATION', 'PACKAGING', 'MATERIALS', 'PITCH_READY', 'OUT_TO_BUYERS', 'NETWORK_DEVELOPMENT_DEAL', 'GREENLIGHT');
ALTER TABLE "Project"
  ADD COLUMN "standardizedFormat" "SlateFormat",
  ADD COLUMN "narrativeEngine" "NarrativeEngine",
  ADD COLUMN "primaryGenre" "SlateGenre",
  ADD COLUMN "secondaryGenre" "SlateGenre",
  ADD COLUMN "descriptorTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "pipelineStage" "PipelineStage";
ALTER TABLE "SourcingLead"
  ADD COLUMN "standardizedFormat" "SlateFormat",
  ADD COLUMN "narrativeEngine" "NarrativeEngine",
  ADD COLUMN "primaryGenre" "SlateGenre",
  ADD COLUMN "secondaryGenre" "SlateGenre",
  ADD COLUMN "descriptorTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "IpProperty"
  ADD COLUMN "standardizedFormat" "SlateFormat",
  ADD COLUMN "narrativeEngine" "NarrativeEngine",
  ADD COLUMN "primaryGenre" "SlateGenre",
  ADD COLUMN "secondaryGenre" "SlateGenre",
  ADD COLUMN "descriptorTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
