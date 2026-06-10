-- ============================================================
-- Migration: Flatten invoice_payments → invoices
-- One payment per invoice (SSLCommerz single-transaction model)
-- Run once on the database, then restart the API.
-- ============================================================

-- Step 1: Add new flat payment columns to invoices (if not already added by TypeORM sync)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS transaction_id VARCHAR,
  ADD COLUMN IF NOT EXISTS val_id         VARCHAR,
  ADD COLUMN IF NOT EXISTS gateway        VARCHAR,
  ADD COLUMN IF NOT EXISTS paid_at        TIMESTAMP,
  ADD COLUMN IF NOT EXISTS admin_note     VARCHAR;

-- Step 2: For each invoice, copy the most recent verified payment
-- (or most recent payment if none are verified) into the flat columns
-- and mark the invoice as paid where verified payments exist.
UPDATE invoices AS i
SET
  transaction_id = p.transaction_id,
  val_id         = p.val_id,
  gateway        = p.gateway,
  paid_at        = p.updated_at,
  admin_note     = p.admin_note,
  status         = CASE WHEN p.status = 'verified' THEN 'paid' ELSE i.status END,
  updated_at     = NOW()
FROM (
  -- Pick the single best payment per invoice:
  -- prefer verified, then latest by created_at
  SELECT DISTINCT ON (invoice_id)
    invoice_id,
    transaction_id,
    val_id,
    gateway,
    status,
    admin_note,
    updated_at
  FROM invoice_payments
  ORDER BY invoice_id, (status = 'verified') DESC, created_at DESC
) AS p
WHERE i.id = p.invoice_id;

-- Step 3: Drop the invoice_payments table (no longer needed)
-- OPTIONAL — uncomment when you are confident the migration is correct:
-- DROP TABLE IF EXISTS invoice_payments;

-- Done. Verify:
SELECT id, status, transaction_id, paid_at FROM invoices ORDER BY created_at DESC LIMIT 20;
