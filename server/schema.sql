CREATE TABLE IF NOT EXISTS tenant_branding (
  clerk_org_id text PRIMARY KEY,
  name text NOT NULL,
  address_line1 text NOT NULL DEFAULT '',
  address_line2 text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  additional_phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  logo_key text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
