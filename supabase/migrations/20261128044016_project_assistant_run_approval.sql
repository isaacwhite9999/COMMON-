CREATE TABLE public.research_assistant_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  goal text NOT NULL CHECK (length(btrim(goal)) BETWEEN 10 AND 500),
  evidence text NOT NULL CHECK (length(btrim(evidence)) BETWEEN 20 AND 9000),
  state text NOT NULL DEFAULT 'awaiting_approval' CHECK (state IN ('awaiting_approval','running','succeeded','failed','cancelled')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 2),
  lease_token uuid,
  lease_expires_at timestamptz,
  draft text CHECK (length(draft) BETWEEN 1 AND 20000),
  result_status text CHECK (result_status IN ('complete','partial')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (workspace_id, owner_id)
    REFERENCES public.research_workspaces (id, owner_id) ON DELETE CASCADE,
  CHECK ((state = 'running') = (lease_token IS NOT NULL)),
  CHECK ((state = 'running') = (lease_expires_at IS NOT NULL)),
  CHECK ((state = 'succeeded') = (draft IS NOT NULL)),
  CHECK ((state = 'succeeded') = (result_status IS NOT NULL))
);
CREATE INDEX research_assistant_runs_project_idx
  ON public.research_assistant_runs (workspace_id, owner_id, created_at DESC, id DESC);

ALTER TABLE public.research_assistant_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.research_assistant_runs FROM PUBLIC, anon, authenticated;
GRANT SELECT (id,workspace_id,owner_id,goal,evidence,state,version,attempts,lease_expires_at,draft,result_status,created_at,updated_at)
  ON public.research_assistant_runs TO authenticated;
GRANT INSERT (workspace_id, owner_id, goal, evidence) ON public.research_assistant_runs TO authenticated;
CREATE POLICY research_assistant_runs_read ON public.research_assistant_runs FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()));
CREATE POLICY research_assistant_runs_create ON public.research_assistant_runs FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.research_workspaces w WHERE w.id = workspace_id AND w.owner_id = (SELECT auth.uid())
  ));

CREATE FUNCTION public.claim_research_assistant_run(p_id uuid,p_owner uuid,p_version integer)
RETURNS TABLE (workspace_id uuid,goal text,evidence text,lease_token uuid)
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 UPDATE public.research_assistant_runs r
 SET state='running', version=r.version+1, attempts=r.attempts+1, lease_token=gen_random_uuid(),
     lease_expires_at=clock_timestamp()+interval '120 seconds', updated_at=clock_timestamp()
 WHERE r.id=p_id AND r.owner_id=p_owner AND r.version=p_version AND r.attempts<2 AND (
   r.state IN ('awaiting_approval','failed') OR (r.state='running' AND r.lease_expires_at<=clock_timestamp()))
 RETURNING r.workspace_id,r.goal,r.evidence,r.lease_token;
$$;
REVOKE ALL ON FUNCTION public.claim_research_assistant_run(uuid,uuid,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_research_assistant_run(uuid,uuid,integer) TO service_role;

CREATE FUNCTION public.finish_research_assistant_run(p_id uuid,p_owner uuid,p_lease uuid,p_draft text,p_result_status text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 WITH changed AS (
   UPDATE public.research_assistant_runs r
   SET state=CASE WHEN p_draft IS NULL THEN 'failed' ELSE 'succeeded' END, version=r.version+1,
       lease_token=NULL, lease_expires_at=NULL, draft=p_draft, result_status=p_result_status, updated_at=clock_timestamp()
   WHERE r.id=p_id AND r.owner_id=p_owner AND r.state='running' AND r.lease_token=p_lease
     AND r.lease_expires_at>clock_timestamp()
     AND ((p_draft IS NULL AND p_result_status IS NULL) OR
       (length(btrim(p_draft)) BETWEEN 1 AND 20000 AND p_result_status IN ('complete','partial')))
   RETURNING r.id
 )
 SELECT EXISTS(SELECT 1 FROM changed);
$$;
REVOKE ALL ON FUNCTION public.finish_research_assistant_run(uuid,uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_research_assistant_run(uuid,uuid,uuid,text,text) TO service_role;

CREATE FUNCTION public.cancel_research_assistant_run(p_id uuid,p_version integer)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 WITH changed AS (
   UPDATE public.research_assistant_runs r
   SET state='cancelled', version=r.version+1, lease_token=NULL, lease_expires_at=NULL, updated_at=clock_timestamp()
   WHERE r.id=p_id AND r.owner_id=(SELECT auth.uid()) AND r.version=p_version
     AND r.state IN ('awaiting_approval','running','failed')
   RETURNING r.id
 )
 SELECT EXISTS(SELECT 1 FROM changed);
$$;
REVOKE ALL ON FUNCTION public.cancel_research_assistant_run(uuid,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_research_assistant_run(uuid,integer) TO authenticated;

GRANT DELETE ON public.research_assistant_runs TO authenticated;
CREATE POLICY research_assistant_runs_remove ON public.research_assistant_runs FOR DELETE TO authenticated
  USING (owner_id = (SELECT auth.uid()) AND state IN ('succeeded','failed','cancelled'));
