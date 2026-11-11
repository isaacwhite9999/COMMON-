-- Validation uses real PostgreSQL RLS under authenticated role.
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('11111111-1111-4111-8111-111111111111','alpha@example.test','{"display_name":"Alpha"}'),
 ('22222222-2222-4222-8222-222222222222','bravo@example.test','{"display_name":"Bravo"}');
GRANT USAGE ON SCHEMA public TO authenticated,anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
INSERT INTO public.communities(id,slug,name,description,category,visibility,created_by)
 VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','private-circle','Private Circle','Private discussions for our members','markets','private','11111111-1111-4111-8111-111111111111');
INSERT INTO public.communities(id,slug,name,description,category,visibility,created_by)
 VALUES('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','public-circle','Public Circle','Public group that welcomes new members','education','public','11111111-1111-4111-8111-111111111111');
INSERT INTO public.discussions(id,community_id,author_id,title,body)
 VALUES('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Private shareholder discussion','Discuss a research paper and governance questions.');
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
DO $$
BEGIN
 IF (SELECT count(*) FROM public.communities WHERE slug='private-circle') != 0
 THEN RAISE EXCEPTION 'Private community leaked to unrelated member'; END IF;
 IF (SELECT count(*) FROM public.discussions WHERE id='cccccccc-cccc-4ccc-8ccc-cccccccccccc') != 0
 THEN RAISE EXCEPTION 'Private post leaked to unrelated member'; END IF;
 IF (SELECT count(*) FROM public.communities WHERE slug='public-circle') != 1
 THEN RAISE EXCEPTION 'Public community not discoverable'; END IF;
END$$;
SELECT public.join_public_community('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
DO $$
BEGIN
 IF NOT public.is_member('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222')
 THEN RAISE EXCEPTION 'Public community join did not persist'; END IF;
END$$;
INSERT INTO public.discussions(id,community_id,author_id,title,body)
 VALUES('dddddddd-dddd-4ddd-8ddd-dddddddddddd','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','A public research question','A real group member can share questions.');
INSERT INTO public.watchlist_items(user_id,symbol) VALUES
 ('22222222-2222-4222-8222-222222222222','TSLA');
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
DO $$
BEGIN
 IF (SELECT count(*) FROM public.discussions WHERE id='dddddddd-dddd-4ddd-8ddd-dddddddddddd') != 1
 THEN RAISE EXCEPTION 'Public member discussion not shared'; END IF;
 IF (SELECT count(*) FROM public.watchlist_items WHERE symbol='TSLA') != 0
 THEN RAISE EXCEPTION 'Another users watchlist was exposed'; END IF;
END$$;
RESET ROLE;
-- Test private invitation end-to-end: A issues, B accepts, B gains private visibility.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
SELECT set_config('common.invite_token', public.create_private_invite('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1),false);
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
SELECT public.accept_private_invite(current_setting('common.invite_token'));
DO $
BEGIN
 IF (SELECT count(*) FROM public.communities WHERE slug='private-circle') != 1
 THEN RAISE EXCEPTION 'Accepted invite did not reveal private group'; END IF;
 IF (SELECT count(*) FROM public.discussions WHERE id='cccccccc-cccc-4ccc-8ccc-cccccccccccc') != 1
 THEN RAISE EXCEPTION 'Accepted member cannot see private discussion'; END IF;
END$;
RESET ROLE;
SELECT 'Passed: real PostgreSQL migration, public/private group isolation, private invitations, and watchlist RLS' AS result;
