CREATE TABLE public.research_assistant_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 3 AND 80),
  goal text NOT NULL CHECK (length(btrim(goal)) BETWEEN 10 AND 500),
  evidence text NOT NULL CHECK (length(btrim(evidence)) BETWEEN 20 AND 6000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (workspace_id, owner_id)
    REFERENCES public.research_workspaces (id, owner_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX research_assistant_commands_name_idx
  ON public.research_assistant_commands (workspace_id, lower(btrim(name)));
CREATE INDEX research_assistant_commands_page_idx
  ON public.research_assistant_commands (workspace_id, owner_id, created_at DESC, id DESC);

ALTER TABLE public.research_assistant_commands ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.research_assistant_commands FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.research_assistant_commands TO authenticated;
GRANT INSERT (workspace_id, owner_id, name, goal, evidence),
      UPDATE (name, goal, evidence) ON public.research_assistant_commands TO authenticated;

CREATE POLICY research_assistant_commands_owner ON public.research_assistant_commands
  FOR ALL TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.research_workspaces AS w
    WHERE w.id = workspace_id AND w.owner_id = (SELECT auth.uid())
  ));

CREATE TRIGGER research_assistant_command_touch BEFORE UPDATE ON public.research_assistant_commands
 FOR EACH ROW EXECUTE FUNCTION public.set_research_updated_at();
