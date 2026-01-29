-- Grant admin role to ludovic43@msn.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::user_role
FROM auth.users
WHERE LOWER(email) = 'ludovic43@msn.com'
ON CONFLICT (user_id, role) DO NOTHING;