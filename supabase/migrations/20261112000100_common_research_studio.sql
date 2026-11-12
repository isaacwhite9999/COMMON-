-- COMMON Research Studio: member-owned scientific research workspaces.
-- Never stores brokerage orders, money, credential fields, or raw uploaded CSV.
-- All recorded performance metrics are client calculations, not audited returns.

CREATE TABLE public.research_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK(length(trim(title)) BETWEEN 3 AND 110),
  asset_class text NOT NULL DEFAULT 'equity'
    CHECK(asset_class IN ('equity','etf','futures','equity_options','macro','housing','business')),
  symbol text NOT NULL DEFAULT '' CHECK(length(symbol)<=30),
  hypothesis text NOT NULL DEFAULT '' CHECK(length(hypothesis)<=5000),
  research_notes text NOT NULL DEFAULT '' CHECK(length(research_notes)<=12000),
  lifecycle text NOT NULL DEFAULT 'draft'
    CHECK(lifecycle IN ('draft','research','validated','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id,owner_id)
);
CREATE INDEX research_workspaces_owner_updated_idx
 ON public.research_workspaces(owner_id,updated_at DESC);

CREATE TABLE public.research_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  strategy text NOT NULL CHECK(strategy IN ('buy_hold','sma_crossover')),
  source_label text NOT NULL DEFAULT '' CHECK(length(source_label)<=120),
  source_sha256 text NOT NULL
    CHECK(source_sha256 ~ '^[0-9a-f]{64}$'),
  dataset_rows integer NOT NULL CHECK(dataset_rows BETWEEN 30 AND 100000),
  sample_start date NOT NULL,
  sample_end date NOT NULL,
  CHECK(sample_end>sample_start),
  assumptions jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK(jsonb_typeof(assumptions)='object' AND octet_length(assumptions::text)<=12000),
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK(jsonb_typeof(metrics)='object' AND octet_length(metrics::text)<=20000),
  diagnostics jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK(jsonb_typeof(diagnostics)='object' AND octet_length(diagnostics::text)<=16000),
  method_version text NOT NULL DEFAULT 'common-lab-v1' CHECK(length(method_version)<=50),
  verified_external boolean NOT NULL DEFAULT false
    CHECK(verified_external = false),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(workspace_id,owner_id)
    REFERENCES public.research_workspaces(id,owner_id) ON DELETE CASCADE
);
CREATE INDEX research_experiments_owner_created_idx
 ON public.research_experiments(owner_id,created_at DESC);
CREATE INDEX research_experiments_workspace_created_idx
 ON public.research_experiments(workspace_id,created_at DESC);

CREATE TABLE public.research_learning_progress (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_key text NOT NULL CHECK(lesson_key ~ '^[a-z][a-z0-9_-]{2,79}$'),
  completed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,lesson_key)
);

CREATE OR REPLACE FUNCTION public.set_research_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  NEW.updated_at:=now();
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.set_research_updated_at() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER research_workspace_touch BEFORE UPDATE ON public.research_workspaces
 FOR EACH ROW EXECUTE FUNCTION public.set_research_updated_at();

ALTER TABLE public.research_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_learning_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace owner can see private research"
 ON public.research_workspaces FOR SELECT TO authenticated
 USING(owner_id=(SELECT auth.uid()));
CREATE POLICY "workspace owner creates own research"
 ON public.research_workspaces FOR INSERT TO authenticated
 WITH CHECK(owner_id=(SELECT auth.uid()));
CREATE POLICY "workspace owner can update own research"
 ON public.research_workspaces FOR UPDATE TO authenticated
 USING(owner_id=(SELECT auth.uid())) WITH CHECK(owner_id=(SELECT auth.uid()));
CREATE POLICY "workspace owner can delete own research"
 ON public.research_workspaces FOR DELETE TO authenticated
 USING(owner_id=(SELECT auth.uid()));

CREATE POLICY "experiment owner can read runs"
 ON public.research_experiments FOR SELECT TO authenticated
 USING(owner_id=(SELECT auth.uid()));
CREATE POLICY "experiment owner can save runs"
 ON public.research_experiments FOR INSERT TO authenticated
 WITH CHECK(owner_id=(SELECT auth.uid()));
CREATE POLICY "experiment owner can remove runs"
 ON public.research_experiments FOR DELETE TO authenticated
 USING(owner_id=(SELECT auth.uid()));
-- There is no update policy: research runs are immutable.
CREATE POLICY "member can read own course progress"
 ON public.research_learning_progress FOR SELECT TO authenticated
 USING(user_id=(SELECT auth.uid()));
CREATE POLICY "member can save own course progress"
 ON public.research_learning_progress FOR INSERT TO authenticated
 WITH CHECK(user_id=(SELECT auth.uid()));
CREATE POLICY "member can update own course progress"
 ON public.research_learning_progress FOR UPDATE TO authenticated
 USING(user_id=(SELECT auth.uid())) WITH CHECK(user_id=(SELECT auth.uid()));

REVOKE ALL ON public.research_workspaces,public.research_experiments,public.research_learning_progress
 FROM anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.research_workspaces TO authenticated;
GRANT SELECT,INSERT,DELETE ON public.research_experiments TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.research_learning_progress TO authenticated;

-- Prevent mutation of workspace identity even by the owner, and preserve audit fields.
CREATE OR REPLACE FUNCTION public.protect_research_identity()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.id<>OLD.id OR NEW.owner_id<>OLD.owner_id OR NEW.created_at<>OLD.created_at
 THEN RAISE EXCEPTION 'Research workspace ownership and creation date are immutable'; END IF;
 RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.protect_research_identity() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER protect_research_workspace BEFORE UPDATE ON public.research_workspaces
 FOR EACH ROW EXECUTE FUNCTION public.protect_research_identity();
