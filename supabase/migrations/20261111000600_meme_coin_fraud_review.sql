-- COMMON Trust & Safety: zero tolerance for meme-coin promotion and rug-pull scams.
-- Merely mentioning a meme coin is an internal safety signal, NOT proof of fraud.
-- All detected content is hidden from recipients/public pending human review.
-- Direct messages can only be reviewed by separately authorized Trust & Safety staff.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated;

CREATE TABLE public.trust_safety_staff (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.moderation_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL CHECK (item_type IN
    ('community','discussion','community_message','direct_message',
     'proposal','ownership_project','source')),
  item_id uuid NOT NULL,
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT 'potential_fraud',
  matched_rules text[] NOT NULL DEFAULT '{}',
  content_preview text NOT NULL DEFAULT '' CHECK (length(content_preview) <= 400),
  review_status text NOT NULL DEFAULT 'pending'
     CHECK (review_status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id),
  review_note text NOT NULL DEFAULT '' CHECK (length(review_note) <= 1000),
  UNIQUE (item_type,item_id)
);
CREATE INDEX moderation_cases_queue_idx ON public.moderation_cases
  (review_status,created_at DESC);
CREATE INDEX moderation_cases_actor_idx ON public.moderation_cases
  (actor_id,created_at DESC);
CREATE INDEX moderation_cases_group_idx ON public.moderation_cases
  (community_id,review_status,created_at DESC);

CREATE TABLE public.account_risk_signals (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  signal_count integer NOT NULL DEFAULT 0 CHECK (signal_count>=0),
  most_recent_at timestamptz NOT NULL DEFAULT now(),
  requires_review boolean NOT NULL DEFAULT true
);
CREATE TABLE public.moderation_case_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.moderation_cases(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id),
  action text NOT NULL CHECK(action IN ('approved','rejected')),
  rationale text NOT NULL DEFAULT '' CHECK (length(rationale)<=1000),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trust_safety_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_risk_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_case_actions ENABLE ROW LEVEL SECURITY;

-- Staff assignment happens only in privileged project administration.
REVOKE ALL ON public.trust_safety_staff FROM anon,authenticated;
REVOKE ALL ON public.account_risk_signals FROM anon,authenticated;
REVOKE ALL ON public.moderation_cases FROM anon,authenticated;
REVOKE ALL ON public.moderation_case_actions FROM anon,authenticated;

CREATE OR REPLACE FUNCTION private.is_trust_staff(uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND uid=auth.uid()
 AND EXISTS (SELECT 1 FROM public.trust_safety_staff s WHERE s.user_id=auth.uid());
$$;
REVOKE ALL ON FUNCTION private.is_trust_staff(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.is_trust_staff(uuid) TO authenticated;

CREATE POLICY "review case access by author or assigned reviewers"
ON public.moderation_cases FOR SELECT TO authenticated
USING (
  actor_id=(SELECT auth.uid())
  OR (community_id IS NOT NULL AND public.is_moderator(community_id,(SELECT auth.uid())))
  OR private.is_trust_staff((SELECT auth.uid()))
);
CREATE POLICY "moderation action history for authorized reviewers"
ON public.moderation_case_actions FOR SELECT TO authenticated
USING (
  EXISTS (
   SELECT 1 FROM public.moderation_cases c WHERE c.id=case_id
    AND (
      (c.community_id IS NOT NULL AND public.is_moderator(c.community_id,(SELECT auth.uid())))
      OR private.is_trust_staff((SELECT auth.uid()))
    )
  )
);
GRANT SELECT ON public.moderation_cases TO authenticated;
GRANT SELECT ON public.moderation_case_actions TO authenticated;

-- Exact-match rules are deterministic; punctuation/spacing variants included.
-- All are REVIEW SIGNALS. In particular, a victim warning about a rug pull is
-- NOT automatically treated as a scammer.
CREATE OR REPLACE FUNCTION private.fraud_signals(content text)
RETURNS text[] LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE signals text[] := '{}'; c text := coalesce(content,'');
BEGIN
 IF c ~* '(^|[^[:alnum:]_])(meme[[:space:]_-]*coins?|memecoins?|dogecoin|shiba[[:space:]]+inu|pepe[[:space:]]+coin|bonk[[:space:]]+coin)([^[:alnum:]_]|$)'
    OR c ~* '\$(DOGE|SHIB|PEPE|BONK)([^[:alnum:]_]|$)' THEN
   signals:=array_append(signals,'meme_coin_mention');
 END IF;
 IF c ~* '(^|[^[:alnum:]_])(rug[[:space:]_-]*pull(ing|s)?|pump[[:space:]_-]*(and|&)[[:space:]_-]*dump|exit[[:space:]_-]*scam)([^[:alnum:]_]|$)' THEN
   signals:=array_append(signals,'rug_pull_or_manipulation');
 END IF;
 IF c ~* '(connect[[:space:]]+(your[[:space:]]+)?wallet|send[[:space:]]+(usdt|eth|sol)|token[[:space:]]+presale|guaranteed[[:space:]]+(profit|return)s?|100x[[:space:]]+(gain|return)s?)' THEN
   signals:=array_append(signals,'suspicious_financial_solicitation');
 END IF;
 RETURN signals;
END; $$;
REVOKE ALL ON FUNCTION private.fraud_signals(text) FROM PUBLIC,anon,authenticated;

-- A client cannot release held content by changing a column or editing text:
-- only the review RPC can change moderation_cases.review_status.
CREATE OR REPLACE FUNCTION private.moderation_visible(kind text, target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT NOT EXISTS (
   SELECT 1 FROM public.moderation_cases c WHERE c.item_type=kind
   AND c.item_id=target AND c.review_status <> 'approved'
 );
$$;
REVOKE ALL ON FUNCTION private.moderation_visible(text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.moderation_visible(text,uuid) TO anon,authenticated;

-- After insert and after content edits, classify all major UGC surfaces.
-- The case and content insert commit atomically; no publication window exists.
CREATE OR REPLACE FUNCTION private.capture_fraud_signal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 data jsonb := to_jsonb(NEW);
 content text;
 signals text[];
 kind text;
 actor uuid;
 cid uuid;
 affected int;
BEGIN
 content:=concat_ws(' ',
  data->>'name',data->>'description',data->>'title',data->>'body',
  data->>'rationale',data->>'thesis',data->>'notes',data->>'url');
 signals:=private.fraud_signals(content);
 IF coalesce(array_length(signals,1),0)=0 THEN RETURN NEW; END IF;

 kind:=CASE TG_TABLE_NAME
   WHEN 'communities' THEN 'community'
   WHEN 'discussions' THEN 'discussion'
   WHEN 'community_messages' THEN 'community_message'
   WHEN 'direct_messages' THEN 'direct_message'
   WHEN 'proposals' THEN 'proposal'
   WHEN 'ownership_projects' THEN 'ownership_project'
   WHEN 'sources' THEN 'source' ELSE NULL END;
 IF kind IS NULL THEN RETURN NEW; END IF;
 actor:=CASE kind
   WHEN 'community' THEN (data->>'created_by')::uuid
   WHEN 'direct_message' THEN (data->>'sender_id')::uuid
   WHEN 'source' THEN (data->>'added_by')::uuid
   ELSE (data->>'author_id')::uuid END;
 cid:=CASE kind
   WHEN 'community' THEN NEW.id
   WHEN 'direct_message' THEN NULL
   WHEN 'source' THEN (SELECT p.community_id FROM public.ownership_projects p WHERE p.id=(data->>'project_id')::uuid)
   ELSE (data->>'community_id')::uuid END;

 INSERT INTO public.moderation_cases
   (item_type,item_id,actor_id,community_id,reason,matched_rules,content_preview,review_status)
 VALUES (kind,NEW.id,actor,cid,'potential_fraud',signals,left(content,400),'pending')
 ON CONFLICT(item_type,item_id) DO NOTHING;
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected=0 THEN
   UPDATE public.moderation_cases
   SET matched_rules=signals,content_preview=left(content,400),
       reason='potential_fraud',review_status='pending',
       reviewed_by=NULL,reviewed_at=NULL,review_note=''
   WHERE item_type=kind AND item_id=NEW.id;
 ELSE
   INSERT INTO public.account_risk_signals(user_id,signal_count,most_recent_at,requires_review)
   VALUES(actor,1,now(),true)
   ON CONFLICT(user_id) DO UPDATE SET
      signal_count=public.account_risk_signals.signal_count+1,
      most_recent_at=now(),requires_review=true;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.capture_fraud_signal() FROM PUBLIC,anon,authenticated;

CREATE TRIGGER common_guard_communities AFTER INSERT OR UPDATE OF name,description
ON public.communities FOR EACH ROW EXECUTE FUNCTION private.capture_fraud_signal();
CREATE TRIGGER common_guard_discussions AFTER INSERT OR UPDATE OF title,body
ON public.discussions FOR EACH ROW EXECUTE FUNCTION private.capture_fraud_signal();
CREATE TRIGGER common_guard_community_messages AFTER INSERT OR UPDATE OF body
ON public.community_messages FOR EACH ROW EXECUTE FUNCTION private.capture_fraud_signal();
CREATE TRIGGER common_guard_direct_messages AFTER INSERT ON public.direct_messages
FOR EACH ROW EXECUTE FUNCTION private.capture_fraud_signal();
CREATE TRIGGER common_guard_proposals AFTER INSERT OR UPDATE OF title,rationale
ON public.proposals FOR EACH ROW EXECUTE FUNCTION private.capture_fraud_signal();
CREATE TRIGGER common_guard_projects AFTER INSERT OR UPDATE OF title,thesis
ON public.ownership_projects FOR EACH ROW EXECUTE FUNCTION private.capture_fraud_signal();
CREATE TRIGGER common_guard_sources AFTER INSERT OR UPDATE OF title,url,notes
ON public.sources FOR EACH ROW EXECUTE FUNCTION private.capture_fraud_signal();

-- Replace read policies, preserving existing membership/privacy boundaries.
DROP POLICY IF EXISTS "public communities discoverable; private members only" ON public.communities;
CREATE POLICY "public communities discoverable; private members only"
ON public.communities FOR SELECT
USING ((visibility='public' OR public.is_member(id,(SELECT auth.uid())))
 AND (private.moderation_visible('community',id)
   OR created_by=(SELECT auth.uid())
   OR public.is_moderator(id,(SELECT auth.uid()))));

DROP POLICY IF EXISTS "read group discussions" ON public.discussions;
CREATE POLICY "read group discussions" ON public.discussions FOR SELECT
USING (public.can_view_community(community_id,(SELECT auth.uid()))
 AND deleted_at IS NULL
 AND (private.moderation_visible('discussion',id)
   OR author_id=(SELECT auth.uid())
   OR public.is_moderator(community_id,(SELECT auth.uid()))));

DROP POLICY IF EXISTS "group members can read chat" ON public.community_messages;
CREATE POLICY "group members can read chat" ON public.community_messages FOR SELECT TO authenticated
USING (public.is_member(community_id,(SELECT auth.uid()))
 AND deleted_at IS NULL
 AND (private.moderation_visible('community_message',id)
   OR author_id=(SELECT auth.uid())
   OR public.is_moderator(community_id,(SELECT auth.uid()))));

DROP POLICY IF EXISTS "DM participant can read" ON public.direct_messages;
CREATE POLICY "DM participant can read" ON public.direct_messages FOR SELECT TO authenticated
USING ((sender_id=(SELECT auth.uid()) OR recipient_id=(SELECT auth.uid()))
 AND NOT public.dm_block_exists(sender_id,recipient_id)
 AND (private.moderation_visible('direct_message',id)
   OR sender_id=(SELECT auth.uid())));

DROP POLICY IF EXISTS "read group proposals" ON public.proposals;
CREATE POLICY "read group proposals" ON public.proposals FOR SELECT
USING (public.can_view_community(community_id,(SELECT auth.uid()))
 AND (private.moderation_visible('proposal',id)
   OR author_id=(SELECT auth.uid())
   OR public.is_moderator(community_id,(SELECT auth.uid()))));

DROP POLICY IF EXISTS "read research projects" ON public.ownership_projects;
CREATE POLICY "read research projects" ON public.ownership_projects FOR SELECT
USING (public.can_view_community(community_id,(SELECT auth.uid()))
 AND (private.moderation_visible('ownership_project',id)
   OR author_id=(SELECT auth.uid())
   OR public.is_moderator(community_id,(SELECT auth.uid()))));

DROP POLICY IF EXISTS "read research sources" ON public.sources;
CREATE POLICY "read research sources" ON public.sources FOR SELECT
USING (private.moderation_visible('source',id)
 AND EXISTS(SELECT 1 FROM public.ownership_projects p WHERE p.id=project_id
   AND public.can_view_community(p.community_id,(SELECT auth.uid())))
 OR added_by=(SELECT auth.uid()));

-- Only independent moderators can release or reject held content.
-- An owner cannot clear their own flagged investment pitch.
CREATE OR REPLACE FUNCTION public.review_moderation_case(
  case_id uuid, decision text, rationale text DEFAULT ''
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.moderation_cases%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF decision NOT IN ('approved','rejected') OR length(rationale)>1000 THEN
   RAISE EXCEPTION 'Invalid moderation decision'; END IF;
 SELECT * INTO c FROM public.moderation_cases WHERE id=case_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Review case unavailable'; END IF;
 IF c.actor_id=auth.uid() THEN
   RAISE EXCEPTION 'Self-review is prohibited'; END IF;
 IF NOT (private.is_trust_staff(auth.uid())
   OR (c.community_id IS NOT NULL AND public.is_moderator(c.community_id,auth.uid())))
 THEN RAISE EXCEPTION 'Not authorized to review this content'; END IF;
 IF c.review_status <> 'pending' THEN RAISE EXCEPTION 'Already reviewed'; END IF;
 UPDATE public.moderation_cases SET
   review_status=decision,reviewed_at=now(),reviewed_by=auth.uid(),review_note=rationale
   WHERE id=case_id;
 INSERT INTO public.moderation_case_actions(case_id,reviewer_id,action,rationale)
   VALUES(case_id,auth.uid(),decision,rationale);
END; $$;
REVOKE ALL ON FUNCTION public.review_moderation_case(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.review_moderation_case(uuid,text,text) TO authenticated;


-- Fix an existing integrity trigger's reference to a discussion-only column.
-- PL/pgSQL does not guarantee short-circuit evaluation for NEW.parent_id on other tables.
CREATE OR REPLACE FUNCTION public.enforce_community_record_integrity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE parent_group uuid; parent_parent uuid;
BEGIN
 IF TG_OP='UPDATE' THEN
   IF NEW.id<>OLD.id OR NEW.community_id<>OLD.community_id
     OR NEW.author_id<>OLD.author_id OR NEW.created_at<>OLD.created_at
   THEN RAISE EXCEPTION 'Record identity and community cannot be changed'; END IF;
 END IF;
 IF TG_TABLE_NAME='discussions' THEN
   IF TG_OP='UPDATE' AND NEW.parent_id IS DISTINCT FROM OLD.parent_id THEN
      RAISE EXCEPTION 'Discussion parent cannot be reassigned'; END IF;
   IF NEW.parent_id IS NOT NULL THEN
     SELECT d.community_id,d.parent_id INTO parent_group,parent_parent
       FROM public.discussions d WHERE d.id=NEW.parent_id;
     IF parent_group IS NULL OR parent_group<>NEW.community_id OR parent_parent IS NOT NULL
     THEN RAISE EXCEPTION 'Reply must belong to a top-level post in the same community'; END IF;
   END IF;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.enforce_community_record_integrity()
  FROM PUBLIC,anon,authenticated;
