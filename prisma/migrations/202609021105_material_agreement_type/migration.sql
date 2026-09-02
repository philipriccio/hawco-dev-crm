-- Add project agreements as a first-class material attachment type.
ALTER TYPE "MaterialType" ADD VALUE IF NOT EXISTS 'AGREEMENT';
