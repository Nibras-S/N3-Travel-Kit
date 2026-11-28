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

-- Platform approval is independent of Clerk organization membership.
CREATE TABLE IF NOT EXISTS platform_users (
  clerk_user_id text PRIMARY KEY,
  email text NOT NULL DEFAULT '',
  display_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
  plan_name text NOT NULL DEFAULT 'Standard',
  expires_at timestamptz,
  reviewed_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS platform_access_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subject_user_id text NOT NULL,
  actor_user_id text NOT NULL,
  details jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS platform_users_created_at_idx ON platform_users (created_at DESC, clerk_user_id);

CREATE TABLE IF NOT EXISTS platform_tenants (
  clerk_org_id text PRIMARY KEY,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  reviewed_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
