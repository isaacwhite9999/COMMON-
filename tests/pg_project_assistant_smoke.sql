BEGIN;
INSERT INTO auth.users (id,email,raw_user_meta_data) VALUES
 ('11111111-1111-4111-8111-111111111111','assistant-owner@example.test','{"display_name":"Draft Owner"}'),
 ('22222222-2222-4222-8222-222222222222','assistant-other@example.test','{"display_name":"Other Member"}')
ON CONFLICT (id) DO NOTHING;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
INSERT INTO public.research_workspaces (id,owner_id,title)
VALUES ('ab100000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','Test research project');
INSERT INTO public.research_assistant_drafts (workspace_id,owner_id,goal,evidence,draft,result_status)
VALUES ('ab100000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111',
 'Test an independent research hypothesis','Only evidence expressly selected for testing.','Review the holdout data independently.','partial');
DO $$
BEGIN
 IF (SELECT count(*) FROM public.research_assistant_drafts) <> 1 THEN
  RAISE EXCEPTION 'Owner cannot read saved draft';
 END IF;
 BEGIN
  UPDATE public.research_assistant_drafts SET draft='Updated';
  IF FOUND THEN RAISE EXCEPTION 'Saved draft is writable'; END IF;
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

-- Existing saves default to turn one. Follow-ups can reference only the prior
-- step in the same user's project, and parents survive attempted leaf-first violations.
INSERT INTO public.research_workspaces (id,owner_id,title)
VALUES ('ab100000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','Second research project');
DO $$
DECLARE
 root_id uuid;
 turn_id uuid;
 next_step smallint;
BEGIN
 SELECT id INTO STRICT root_id FROM public.research_assistant_drafts WHERE step_number=1;
 turn_id:=root_id;
 FOR next_step IN 2..5 LOOP
  INSERT INTO public.research_assistant_drafts (workspace_id,owner_id,goal,evidence,draft,result_status,parent_draft_id,step_number)
  VALUES ('ab100000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111',
   'Test an independent research hypothesis','New evidence for this follow-up turn.','Refined methodology.','complete',turn_id,next_step)
  RETURNING id INTO turn_id;
 END LOOP;
 BEGIN
  INSERT INTO public.research_assistant_drafts (workspace_id,owner_id,goal,evidence,draft,result_status,parent_draft_id,step_number)
  VALUES ('ab100000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111',
   'Test an independent research hypothesis','New evidence for this follow-up turn.','Exceeded.','complete',turn_id,6);
  RAISE EXCEPTION 'Draft depth exceeded the five-turn bound';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO public.research_assistant_drafts (workspace_id,owner_id,goal,evidence,draft,result_status,parent_draft_id,step_number)
  VALUES ('ab100000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111',
   'Test an independent research hypothesis','New evidence for this follow-up turn.','Cross-project.','complete',root_id,2);
  RAISE EXCEPTION 'Cross-project parent accepted';
 EXCEPTION WHEN foreign_key_violation THEN NULL; END;
 BEGIN
  INSERT INTO public.research_assistant_drafts (workspace_id,owner_id,goal,evidence,draft,result_status,parent_draft_id,step_number)
  VALUES ('ab100000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111',
   'Test an independent research hypothesis','New evidence for this follow-up turn.','Skipped turn.','complete',root_id,3);
  RAISE EXCEPTION 'Skipped turn accepted';
 EXCEPTION WHEN foreign_key_violation THEN NULL; END;
 BEGIN
  DELETE FROM public.research_assistant_drafts WHERE id=root_id;
  RAISE EXCEPTION 'Parent deleted before child';
 EXCEPTION WHEN foreign_key_violation THEN NULL; END;
END $$;

SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.research_assistant_drafts) THEN
  RAISE EXCEPTION 'Draft leaked to unrelated member';
 END IF;
 DELETE FROM public.research_assistant_drafts;
 IF FOUND THEN RAISE EXCEPTION 'Unrelated member deleted protected history'; END IF;
 BEGIN
  INSERT INTO public.research_assistant_drafts (workspace_id,owner_id,goal,evidence,draft,result_status)
  VALUES ('ab100000-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222',
   'Test attempted project crossover','Unauthorized writes to other workspaces fail.','Never persisted.','complete');
  RAISE EXCEPTION 'Non-owner could save drafts on private research';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

SET LOCAL ROLE anon;
DO $$
BEGIN
 BEGIN
  PERFORM 1 FROM public.research_assistant_drafts;
  RAISE EXCEPTION 'Anonymous draft access';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
DELETE FROM public.research_workspaces WHERE id='ab100000-0000-4000-8000-000000000001';
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.research_assistant_drafts) THEN
  RAISE EXCEPTION 'Project deletion did not remove assistant drafts';
 END IF;
END $$;
ROLLBACK;
