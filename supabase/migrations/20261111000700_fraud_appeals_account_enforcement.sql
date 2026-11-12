-- COMMON Trust & Safety: appeals and human-confirmed account enforcement.
-- No bans based solely on keyword flags; only authorized staff may restrict accounts.

CREATE TABLE public.moderation_appeals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 case_id uuid NOT NULL REFERENCES public.moderation_cases(id) ON DELETE CASCADE,
 appellant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 statement text NOT NULL CHECK(length(trim(statement)) BETWEEN 20 AND 2000),
 appeal_status text NOT NULL DEFAULT 'pending'
   CHECK(appeal_status IN ('pending','accepted','denied')),
 created_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz,
 resolved_by uuid REFERENCES public.profiles(id),
 response text NOT NULL DEFAULT '' CHECK(length(response)<=1200),
 UNIQUE(case_id,appellant_id)
);
CREATE INDEX moderation_appeals_queue_idx ON public.moderation_appeals(appeal_status,created_at DESC);

CREATE TABLE public.account_enforcement (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 restriction text NOT NULL CHECK(restriction IN ('restricted','suspended')),
 reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 10 AND 2000),
 imposed_by uuid NOT NULL REFERENCES public.profiles(id),
 imposed_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz,
 CHECK(expires_at IS NULL OR expires_at>imposed_at)
);
CREATE TABLE public.account_enforcement_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 staff_id uuid NOT NULL REFERENCES public.profiles(id),
 action text NOT NULL CHECK(action IN ('restricted','suspended','restored')),
 reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 10 AND 2000),
 created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.moderation_appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_enforcement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_enforcement_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.moderation_appeals FROM anon,authenticated;
REVOKE ALL ON public.account_enforcement FROM anon,authenticated;
REVOKE ALL ON public.account_enforcement_events FROM anon,authenticated;

CREATE POLICY "appellant and independent reviewers see appeals"
ON public.moderation_appeals FOR SELECT TO authenticated
USING (
 appellant_id=(SELECT auth.uid()) OR private.is_trust_staff((SELECT auth.uid()))
 OR EXISTS(
  SELECT 1 FROM public.moderation_cases c WHERE c.id=case_id
  AND c.community_id IS NOT NULL AND public.is_moderator(c.community_id,(SELECT auth.uid()))
 )
);
CREATE POLICY "only authors may appeal rejected cases"
ON public.moderation_appeals FOR INSERT TO authenticated
WITH CHECK (
 appellant_id=(SELECT auth.uid())
 AND appeal_status='pending'
 AND resolved_at IS NULL AND resolved_by IS NULL AND response=''
 AND EXISTS(
  SELECT 1 FROM public.moderation_cases c
  WHERE c.id=case_id AND c.actor_id=(SELECT auth.uid()) AND c.review_status='rejected'
 )
);
CREATE POLICY "read own account restrictions or staff"
ON public.account_enforcement FOR SELECT TO authenticated
USING(user_id=(SELECT auth.uid()) OR private.is_trust_staff((SELECT auth.uid())));
CREATE POLICY "read own enforcement history or staff"
ON public.account_enforcement_events FOR SELECT TO authenticated
USING(user_id=(SELECT auth.uid()) OR private.is_trust_staff((SELECT auth.uid())));
GRANT SELECT,INSERT ON public.moderation_appeals TO authenticated;
GRANT SELECT ON public.account_enforcement TO authenticated;
GRANT SELECT ON public.account_enforcement_events TO authenticated;

CREATE OR REPLACE FUNCTION public.review_moderation_appeal(
 appeal_id uuid, decision text, rationale text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.moderation_appeals%ROWTYPE;
DECLARE c public.moderation_cases%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF decision NOT IN ('accepted','denied') OR length(trim(rationale))<10
    OR length(rationale)>1200 THEN RAISE EXCEPTION 'Decision requires a reason'; END IF;
 SELECT * INTO a FROM public.moderation_appeals WHERE id=appeal_id FOR UPDATE;
 IF NOT FOUND OR a.appeal_status<>'pending' THEN
   RAISE EXCEPTION 'Appeal unavailable'; END IF;
 SELECT * INTO c FROM public.moderation_cases WHERE id=a.case_id FOR UPDATE;
 IF NOT FOUND OR c.review_status<>'rejected' THEN
   RAISE EXCEPTION 'Case is no longer rejected'; END IF;
 IF c.actor_id=auth.uid() OR c.reviewed_by=auth.uid() THEN
   RAISE EXCEPTION 'Appeals require a different reviewer'; END IF;
 IF NOT (private.is_trust_staff(auth.uid()) OR
   (c.community_id IS NOT NULL AND public.is_moderator(c.community_id,auth.uid())))
 THEN RAISE EXCEPTION 'Not authorized'; END IF;
 UPDATE public.moderation_appeals SET appeal_status=decision,
   resolved_at=now(),resolved_by=auth.uid(),response=rationale WHERE id=appeal_id;
 IF decision='accepted' THEN
   UPDATE public.moderation_cases SET
     review_status='approved',reviewed_at=now(),reviewed_by=auth.uid(),review_note=rationale
   WHERE id=c.id;
   INSERT INTO public.moderation_case_actions(case_id,reviewer_id,action,rationale)
   VALUES(c.id,auth.uid(),'approved','Appeal accepted: '||left(rationale,980));
 END IF;
END; $$;
REVOKE ALL ON FUNCTION public.review_moderation_appeal(uuid,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.review_moderation_appeal(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.manage_account_enforcement(
 target_user uuid, decision text, rationale text,
 restrict_until timestamptz DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_trust_staff(auth.uid())
 THEN RAISE EXCEPTION 'Authorized safety staff only'; END IF;
 IF target_user=auth.uid() OR
   EXISTS(SELECT 1 FROM public.trust_safety_staff WHERE user_id=target_user)
 THEN RAISE EXCEPTION 'Cannot enforce against a Trust & Safety staff account'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=target_user)
 THEN RAISE EXCEPTION 'Target account does not exist'; END IF;
 IF decision NOT IN ('restricted','suspended','restored') OR
   length(trim(rationale))<10 OR length(rationale)>2000
 THEN RAISE EXCEPTION 'A documented enforcement decision is required'; END IF;
 IF restrict_until IS NOT NULL AND restrict_until<=now()
 THEN RAISE EXCEPTION 'Expiration must be in the future'; END IF;
 IF decision='restored' THEN
   DELETE FROM public.account_enforcement WHERE user_id=target_user;
 ELSE
   INSERT INTO public.account_enforcement(user_id,restriction,reason,imposed_by,expires_at)
   VALUES(target_user,decision,rationale,auth.uid(),restrict_until)
   ON CONFLICT(user_id) DO UPDATE
     SET restriction=excluded.restriction,reason=excluded.reason,
         imposed_by=excluded.imposed_by,imposed_at=now(),expires_at=excluded.expires_at;
 END IF;
 INSERT INTO public.account_enforcement_events(user_id,staff_id,action,reason)
 VALUES(target_user,auth.uid(),decision,rationale);
END; $$;
REVOKE ALL ON FUNCTION public.manage_account_enforcement(uuid,text,text,timestamptz)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.manage_account_enforcement(uuid,text,text,timestamptz)
 TO authenticated;

-- Prevent suspended accounts from posting through ANY major content API
-- (even when a client bypasses the user interface).
CREATE OR REPLACE FUNCTION private.enforce_account_posting()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d jsonb := to_jsonb(NEW);
DECLARE actor uuid;
BEGIN
 actor:=CASE TG_TABLE_NAME
   WHEN 'communities' THEN (d->>'created_by')::uuid
   WHEN 'direct_messages' THEN (d->>'sender_id')::uuid
   WHEN 'sources' THEN (d->>'added_by')::uuid
   ELSE (d->>'author_id')::uuid END;
 IF EXISTS(
   SELECT 1 FROM public.account_enforcement e WHERE e.user_id=actor
   AND (e.expires_at IS NULL OR e.expires_at>now())
 ) THEN RAISE EXCEPTION 'Account posting is restricted; contact COMMON Trust & Safety'; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.enforce_account_posting() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER common_enforce_communities BEFORE INSERT ON public.communities
 FOR EACH ROW EXECUTE FUNCTION private.enforce_account_posting();
CREATE TRIGGER common_enforce_discussions BEFORE INSERT ON public.discussions
 FOR EACH ROW EXECUTE FUNCTION private.enforce_account_posting();
CREATE TRIGGER common_enforce_community_messages BEFORE INSERT ON public.community_messages
 FOR EACH ROW EXECUTE FUNCTION private.enforce_account_posting();
CREATE TRIGGER common_enforce_direct_messages BEFORE INSERT ON public.direct_messages
 FOR EACH ROW EXECUTE FUNCTION private.enforce_account_posting();
CREATE TRIGGER common_enforce_proposals BEFORE INSERT ON public.proposals
 FOR EACH ROW EXECUTE FUNCTION private.enforce_account_posting();
CREATE TRIGGER common_enforce_projects BEFORE INSERT ON public.ownership_projects
 FOR EACH ROW EXECUTE FUNCTION private.enforce_account_posting();
CREATE TRIGGER common_enforce_sources BEFORE INSERT ON public.sources
 FOR EACH ROW EXECUTE FUNCTION private.enforce_account_posting();
