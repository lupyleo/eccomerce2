-- Full-text search GIN index for products
-- This enables fast keyword search on product name and description

-- Create GIN index for full-text search on products table
CREATE INDEX IF NOT EXISTS "products_fts_idx" ON "products" USING GIN (
  to_tsvector('simple', coalesce("name", '') || ' ' || coalesce("description", ''))
);
