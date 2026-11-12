-- Expanded Trust & Safety regression: independent appeals and confirmed staff suspensions.
-- Prior smoke tests created A (owner) and B (member), and B's flagged chat.

-- Create independent moderator C, without any public signup email.
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
('33333333-3333-4333-8333-333333333333','independent-review@example.test','{"display_name":"Independent Reviewer"}');
INSERT INTO public.memberships(community_id,user_id,role) VALUES
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','33333333-3333-4333-8333-333333333333','moderator');
INSERT INTO public.trust_safety_staff(user_id) VALUES ('33333333-3333-4333-8333-333333333333');

-- Owner A independently rejects user B's edited meme-coin solicitation.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
SELECT public.review_moderation_case(
 (SELECT id FROM public.moderation_cases WHERE item_type='community_message'
  AND item_id='abababab-abab-4bab-8bab-abababababab'),
 'rejected','Edited message became promotional, not educational');
RESET ROLE;

-- Author B has one right to appeal the case, not to restore their own content.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
INSERT INTO public.moderation_appeals(case_id,appellant_id,statement)
SELECT id,'22222222-2222-4222-8222-222222222222',
 'I believe the moderation decision misread the context. Please conduct a second review.'
FROM public.moderation_cases WHERE item_type='community_message'
 AND item_id='abababab-abab-4bab-8bab-abababababab';
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.moderation_appeals WHERE appellant_id=
 '22222222-2222-4222-8222-222222222222' AND appeal_status='pending')
 THEN RAISE EXCEPTION 'Appeal submission failed'; END IF;
END $$;
RESET ROLE;

-- Same reviewer A cannot decide the appeal they originally rejected.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
DO $$
DECLARE appeal uuid;
BEGIN
 SELECT id INTO appeal FROM public.moderation_appeals LIMIT 1;
 BEGIN
  PERFORM public.review_moderation_appeal(appeal,'accepted',
     'Second opinion required and this message was benign.');
  RAISE EXCEPTION 'Original reviewer bypassed independence';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='Original reviewer bypassed independence' THEN RAISE; END IF;
 END;
END $$;
RESET ROLE;

-- Reviewer C is separate from both author and original reviewer.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
SELECT public.review_moderation_appeal(
 (SELECT id FROM public.moderation_appeals LIMIT 1),
 'denied','The revised message asks people to buy a speculative token');
DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.moderation_appeals WHERE appeal_status='denied')
 THEN RAISE EXCEPTION 'Independent appeal decision not saved'; END IF;
END $$;

-- Confirmed scam enforcement is a staff action, never a keyword-triggered ban.
SELECT public.manage_account_enforcement(
 '22222222-2222-4222-8222-222222222222',
 'suspended','Confirmed scam promotion after independent review',NULL);
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.account_enforcement WHERE
 user_id='22222222-2222-4222-8222-222222222222' AND restriction='suspended')
 THEN RAISE EXCEPTION 'Suspension is not visible to affected user'; END IF;
 BEGIN
  INSERT INTO public.discussions(community_id,author_id,title,body)
  VALUES('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '22222222-2222-4222-8222-222222222222',
  'Attempt during suspension','A suspended account should not publish content');
  RAISE EXCEPTION 'Suspended user published';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='Suspended user published' THEN RAISE; END IF;
 END;
END $$;
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
SELECT public.manage_account_enforcement(
 '22222222-2222-4222-8222-222222222222',
 'restored','Restrictions lifted after documented review',NULL);
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
INSERT INTO public.discussions(community_id,author_id,title,body)
VALUES('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
 '22222222-2222-4222-8222-222222222222',
 'Post after account reinstated','Normal user participation restored.');
RESET ROLE;
SELECT 'Trust safety enforcement verified: appeal, reviewer independence, suspension, restore' AS result;
