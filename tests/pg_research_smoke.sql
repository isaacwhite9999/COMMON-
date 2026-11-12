-- Research workspace privacy tests using the two existing real Auth identities in CI.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
INSERT INTO public.research_workspaces(id,owner_id,title,asset_class,symbol,hypothesis)
VALUES ('98765432-4321-4321-8321-123456789abc',
'11111111-1111-4111-8111-111111111111',
'Private SMA research project','equity','SPY',
'Lagged trend strategy may outperform the benchmark after costs.');
INSERT INTO public.research_experiments
(id,workspace_id,owner_id,strategy,source_label,source_sha256,dataset_rows,sample_start,sample_end,assumptions,metrics)
VALUES ('98765432-4321-4321-8321-abcdefabcdef',
'98765432-4321-4321-8321-123456789abc',
'11111111-1111-4111-8111-111111111111','sma_crossover','prices.csv',
repeat('a',64),180,'2024-01-01','2024-06-28','{"fast":10,"slow":30}'::jsonb,
'{"holdout":{"totalReturn":0.01}}'::jsonb);
DO $$
BEGIN
 IF (SELECT count(*) FROM public.research_workspaces WHERE symbol='SPY')<>1
 THEN RAISE EXCEPTION 'Owner cannot read private workspace'; END IF;
 IF (SELECT count(*) FROM public.research_experiments WHERE source_label='prices.csv')<>1
 THEN RAISE EXCEPTION 'Owner cannot read private experiments'; END IF;
END $$;
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.research_workspaces WHERE symbol='SPY')
 THEN RAISE EXCEPTION 'Research project leaked to another account'; END IF;
 IF EXISTS(SELECT 1 FROM public.research_experiments WHERE source_label='prices.csv')
 THEN RAISE EXCEPTION 'Experiment leaked to another account'; END IF;
 BEGIN
  INSERT INTO public.research_experiments
  (workspace_id,owner_id,strategy,source_label,source_sha256,dataset_rows,sample_start,sample_end)
  VALUES ('98765432-4321-4321-8321-123456789abc',
  '22222222-2222-4222-8222-222222222222','buy_hold','stolen.csv',
   repeat('b',64),180,'2024-01-01','2024-06-28');
  RAISE EXCEPTION 'Wrong owner inserted experiment under other owner';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='Wrong owner inserted experiment under other owner' THEN RAISE; END IF;
 END;
END $$;
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
UPDATE public.research_workspaces SET research_notes='Independent research question with notes'
WHERE id='98765432-4321-4321-8321-123456789abc';
INSERT INTO public.research_learning_progress(user_id,lesson_key,completed)
VALUES ('11111111-1111-4111-8111-111111111111','hypothesis',true);
DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.research_learning_progress
 WHERE lesson_key='hypothesis' AND completed) THEN
 RAISE EXCEPTION 'Progress did not persist';END IF;
END $$;
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.research_learning_progress WHERE lesson_key='hypothesis')
 THEN RAISE EXCEPTION 'Lesson progress leaked to other account'; END IF;
END $$;
RESET ROLE;
SELECT 'PASS research RLS: owner projects, experiments, immutable owner, private progress' AS result;
