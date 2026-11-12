-- COMMON Trust & Safety regression: separate real DB identities and roles.
-- Runs after pg_rls_smoke.sql in the same temporary PostgreSQL database.
-- One account flags content; another must never see held content unless reviewer.

-- A is the owner of the public group. New post mentions meme coins.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
INSERT INTO public.discussions(id,community_id,author_id,title,body)
VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        '11111111-1111-4111-8111-111111111111',
        'Should we buy a memecoin?',
        'Is buying a meme coin a sound long term decision?');
DO $$
DECLARE c uuid;
BEGIN
 SELECT id INTO c FROM public.moderation_cases WHERE item_type='discussion'
 AND item_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
 IF c IS NULL THEN RAISE EXCEPTION 'No meme-coin moderation case'; END IF;
 IF (SELECT review_status FROM public.moderation_cases WHERE id=c)<>'pending'
 THEN RAISE EXCEPTION 'Meme-coin post was not held'; END IF;
 IF (SELECT count(*) FROM public.discussions
   WHERE id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')<>1
 THEN RAISE EXCEPTION 'Author cannot see own held post'; END IF;
 -- Do not let a group owner approve their own risky investment pitch.
 BEGIN
   PERFORM public.review_moderation_case(c,'approved','Approve myself');
   RAISE EXCEPTION 'Self-review vulnerability';
 EXCEPTION WHEN OTHERS THEN
   IF SQLERRM='Self-review vulnerability' THEN RAISE; END IF;
 END;
END $$;
RESET ROLE;

-- B is a regular member; must not see A's held post or review the case.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.discussions
   WHERE id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')
 THEN RAISE EXCEPTION 'Other members can see quarantined meme-coin post'; END IF;
 IF EXISTS(SELECT 1 FROM public.moderation_cases
   WHERE item_type='discussion' AND item_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')
 THEN RAISE EXCEPTION 'Other members can read internal scam-risk signals'; END IF;
END $$;
INSERT INTO public.community_messages(id,community_id,author_id,body)
VALUES('abababab-abab-4bab-8bab-abababababab',
       'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
       '22222222-2222-4222-8222-222222222222',
       'Warning: I believe this was a rug pull. Do not invest.');
DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.moderation_cases WHERE item_type='community_message'
 AND item_id='abababab-abab-4bab-8bab-abababababab'
 AND review_status='pending') THEN
  RAISE EXCEPTION 'Rug-pull warning must be flagged for review, even if benign';
 END IF;
END $$;
RESET ROLE;

-- A, a different person and group owner, may approve the educational warning.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
SELECT public.review_moderation_case(
 (SELECT id FROM public.moderation_cases
  WHERE item_type='community_message' AND item_id='abababab-abab-4bab-8bab-abababababab'),
 'approved','Factual warning with no buy link or solicitation');
DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.community_messages
 WHERE id='abababab-abab-4bab-8bab-abababababab')
 THEN RAISE EXCEPTION 'Approved educational warning is not visible'; END IF;
END $$;
RESET ROLE;

-- B edits formerly approved warning into promotion; trigger must re-quarantine.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
UPDATE public.community_messages SET body='Buy this memecoin immediately and make 100x returns'
 WHERE id='abababab-abab-4bab-8bab-abababababab';
DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.moderation_cases
 WHERE item_type='community_message' AND item_id='abababab-abab-4bab-8bab-abababababab'
 AND review_status='pending')
 THEN RAISE EXCEPTION 'Changing approved content bypassed moderation'; END IF;
END $$;
RESET ROLE;

-- Direct messages are privacy-sensitive: recipient must not see flagged DM
-- and group mods have no permission to review private DM cases.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
UPDATE public.profiles SET allow_direct_messages=true
 WHERE id='11111111-1111-4111-8111-111111111111';
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
INSERT INTO public.direct_messages(id,sender_id,recipient_id,body)
 VALUES('cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd',
 '22222222-2222-4222-8222-222222222222',
 '11111111-1111-4111-8111-111111111111',
 'Send USDT to my wallet to join the presale.');
DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.direct_messages
 WHERE id='cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd')
 THEN RAISE EXCEPTION 'Sender cannot see own held DM'; END IF;
END $$;
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.direct_messages
 WHERE id='cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd')
 THEN RAISE EXCEPTION 'Flagged DM leaked to recipient'; END IF;
 IF EXISTS(SELECT 1 FROM public.moderation_cases
 WHERE item_type='direct_message' AND item_id='cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd')
 THEN RAISE EXCEPTION 'Group owner can inspect unrelated private DM'; END IF;
END $$;
RESET ROLE;

SELECT 'Fraud moderation passed: mention flags, quarantined posts/chats/DMs, self-review block, release and reflag' AS result;
