BEGIN;
INSERT INTO auth.users (id,email,raw_user_meta_data) VALUES
 ('11111111-1111-4111-8111-111111111111','run-owner@example.test','{"display_name":"Run Owner"}'),
 ('22222222-2222-4222-8222-222222222222','run-other@example.test','{"display_name":"Other Member"}')
ON CONFLICT (id) DO NOTHING;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
INSERT INTO public.research_workspaces(id,owner_id,title)
 VALUES ('ab400000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','Planning run fixture');
INSERT INTO public.research_assistant_runs(workspace_id,owner_id,goal,evidence)
 VALUES ('ab400000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111',
 'Review chronological costs','Use the supplied chronological cost evidence.'),
 ('ab400000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111',
 'Cancel stale provider work','Use the supplied chronological cost evidence.'),
 ('ab400000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111',
 'Recover interrupted provider work','Use the supplied chronological cost evidence.');
SELECT set_config('test.run',(SELECT id::text FROM public.research_assistant_runs WHERE goal='Review chronological costs'),true);
SELECT set_config('test.cancel',(SELECT id::text FROM public.research_assistant_runs WHERE goal='Cancel stale provider work'),true);
SELECT set_config('test.expired',(SELECT id::text FROM public.research_assistant_runs WHERE goal='Recover interrupted provider work'),true);
DO $$
BEGIN
 BEGIN
  PERFORM public.claim_research_assistant_run(current_setting('test.run')::uuid,auth.uid(),1);
  RAISE EXCEPTION 'Authenticated role bypassed approval endpoint';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  UPDATE public.research_assistant_runs SET evidence='Mutated after creation';
  RAISE EXCEPTION 'Member rewrote run evidence';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  PERFORM lease_token FROM public.research_assistant_runs;
  RAISE EXCEPTION 'Lease secret visible';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
DO $$
BEGIN
 IF EXISTS(SELECT id FROM public.research_assistant_runs) OR
    public.cancel_research_assistant_run(current_setting('test.run')::uuid,1) THEN
  RAISE EXCEPTION 'Unrelated member read or cancelled protected run';
 END IF;
END $$;

SET LOCAL ROLE service_role;
DO $$
DECLARE
 owner_id uuid:='11111111-1111-4111-8111-111111111111';
 run_id uuid:=current_setting('test.run')::uuid;
 cancel_id uuid:=current_setting('test.cancel')::uuid;
 lease uuid;
BEGIN
 SELECT a.lease_token INTO STRICT lease FROM public.claim_research_assistant_run(run_id,owner_id,1) a;
 IF EXISTS(SELECT 1 FROM public.claim_research_assistant_run(run_id,owner_id,1)) OR
    EXISTS(SELECT 1 FROM public.claim_research_assistant_run(run_id,owner_id,2)) THEN
  RAISE EXCEPTION 'Concurrent or stale claim succeeded';
 END IF;
 IF NOT public.finish_research_assistant_run(run_id,owner_id,lease,NULL,NULL) THEN
  RAISE EXCEPTION 'Failed attempt could not be persisted';
 END IF;
 SELECT a.lease_token INTO STRICT lease FROM public.claim_research_assistant_run(run_id,owner_id,3) a;
 IF NOT public.finish_research_assistant_run(run_id,owner_id,lease,'A bounded research draft','complete') THEN
  RAISE EXCEPTION 'Successful retry could not be persisted';
 END IF;
 IF EXISTS(SELECT 1 FROM public.claim_research_assistant_run(run_id,owner_id,5)) THEN
  RAISE EXCEPTION 'Finished run accepted additional attempt';
 END IF;
 PERFORM set_config('test.cancel_lease',a.lease_token::text,true)
 FROM public.claim_research_assistant_run(cancel_id,owner_id,1) a;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
DO $$
BEGIN
 IF NOT public.cancel_research_assistant_run(current_setting('test.cancel')::uuid,2) THEN
  RAISE EXCEPTION 'Owner could not cancel running work';
 END IF;
 IF NOT EXISTS(SELECT id FROM public.research_assistant_runs WHERE state='succeeded' AND attempts=2 AND version=5) THEN
  RAISE EXCEPTION 'Result or attempt version did not persist';
 END IF;
END $$;
SET LOCAL ROLE service_role;
DO $$
BEGIN
 IF public.finish_research_assistant_run(current_setting('test.cancel')::uuid,'11111111-1111-4111-8111-111111111111',
   current_setting('test.cancel_lease')::uuid,'Late result','complete') THEN
  RAISE EXCEPTION 'Late provider result saved after cancellation';
 END IF;
END $$;
SELECT set_config('test.expired_lease',lease_token::text,true)
 FROM public.claim_research_assistant_run(current_setting('test.expired')::uuid,'11111111-1111-4111-8111-111111111111',1);
RESET ROLE;
UPDATE public.research_assistant_runs SET lease_expires_at=clock_timestamp()-interval '1 second'
 WHERE id=current_setting('test.expired')::uuid;
SET LOCAL ROLE service_role;
DO $$
DECLARE
 owner_id uuid:='11111111-1111-4111-8111-111111111111';
 run_id uuid:=current_setting('test.expired')::uuid;
 old_lease uuid:=current_setting('test.expired_lease')::uuid;
 new_lease uuid;
BEGIN
 IF public.finish_research_assistant_run(run_id,owner_id,old_lease,'Expired result','complete') THEN
  RAISE EXCEPTION 'Expired lease completed';
 END IF;
 SELECT a.lease_token INTO STRICT new_lease FROM public.claim_research_assistant_run(run_id,owner_id,2) a;
 IF new_lease=old_lease THEN RAISE EXCEPTION 'Recovery reused the old lease'; END IF;
 IF NOT public.finish_research_assistant_run(run_id,owner_id,new_lease,NULL,NULL) OR
    EXISTS(SELECT 1 FROM public.claim_research_assistant_run(run_id,owner_id,4)) THEN
  RAISE EXCEPTION 'Recovery did not enforce the two-attempt limit';
 END IF;
END $$;
ROLLBACK;
