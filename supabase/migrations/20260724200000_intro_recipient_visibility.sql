-- Allow users to see introduction requests emailed to their address (even across workspaces).
-- Use SECURITY DEFINER helpers so policies do not re-enter profiles/contacts RLS (avoids 42P17 recursion).

CREATE OR REPLACE FUNCTION public.current_profile_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(btrim(email))
  FROM public.profiles
  WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.contact_email_is_mine(contact_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    contact_email IS NOT NULL
    AND public.current_profile_email() IS NOT NULL
    AND lower(btrim(contact_email)) = public.current_profile_email();
$$;

CREATE OR REPLACE FUNCTION public.can_view_intro_as_recipient(p_target_contact_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.contacts c
    WHERE c.id = p_target_contact_id
      AND public.contact_email_is_mine(c.email)
  );
$$;

REVOKE ALL ON FUNCTION public.current_profile_email() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.contact_email_is_mine(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_intro_as_recipient(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_profile_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.contact_email_is_mine(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_intro_as_recipient(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can view intros targeting their email" ON public.introductions;
CREATE POLICY "Users can view intros targeting their email"
  ON public.introductions
  FOR SELECT
  USING (public.can_view_intro_as_recipient(target_contact_id));

DROP POLICY IF EXISTS "Users can view contacts matching their email" ON public.contacts;
CREATE POLICY "Users can view contacts matching their email"
  ON public.contacts
  FOR SELECT
  USING (public.contact_email_is_mine(email));

-- Do not add a profiles SELECT policy that joins contacts/introductions:
-- that re-enters RLS and causes infinite recursion (42P17).
DROP POLICY IF EXISTS "Users can view requester profiles for intros to them" ON public.profiles;
