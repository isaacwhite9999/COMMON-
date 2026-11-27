-- Private project assistant history. These are member-saved drafts, not audited model runs.
CREATE TABLE public.research_assistant_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  goal text NOT NULL CHECK (length(btrim(goal)) BETWEEN 10 AND 500),
  evidence text NOT NULL CHECK (length(btrim(evidence)) BETWEEN 20 AND 9000),
  draft text NOT NULL CHECK (length(btrim(draft)) BETWEEN 1 AND 20000),
  result_status text NOT NULL CHECK (result_status IN ('complete', 'partial')),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (workspace_id, owner_id)
    REFERENCES public.research_workspaces (id, owner_id) ON DELETE CASCADE
);
CREATE INDEX research_assistant_drafts_workspace_recent_idx
  ON public.research_assistant_drafts (workspace_id, owner_id, created_at DESC, id DESC);

ALTER TABLE public.research_assistant_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.research_assistant_drafts FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.research_assistant_drafts TO authenticated;
GRANT INSERT (workspace_id, owner_id, goal, evidence, draft, result_status)
  ON public.research_assistant_drafts TO authenticated;

CREATE POLICY research_assistant_drafts_select_own ON public.research_assistant_drafts
  FOR SELECT TO authenticated USING (owner_id = (SELECT auth.uid()));
CREATE POLICY research_assistant_drafts_insert_own ON public.research_assistant_drafts
  FOR INSERT TO authenticated WITH CHECK (owner_id = (SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.research_workspaces w
    WHERE w.id = workspace_id AND w.owner_id = (SELECT auth.uid())
  ));
CREATE POLICY research_assistant_drafts_delete_own ON public.research_assistant_drafts
  FOR DELETE TO authenticated USING (owner_id = (SELECT auth.uid()));
