-- Additive only: no existing project is reclassified.
ALTER TYPE "ProjectStatus" ADD VALUE IF NOT EXISTS 'POTENTIAL_DEVELOPMENT';
