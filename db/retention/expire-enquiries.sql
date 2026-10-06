-- Enquiries are kept for 12 months, unless the person joined (the privacy page says so: apps/web/src/pages/privacy.astro).
-- Run by deploy.yml after the migrations on every deploy, so daily in production (the daily rebuild).
DELETE FROM enquiries
WHERE status <> 'joined'
  AND created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-12 months');
