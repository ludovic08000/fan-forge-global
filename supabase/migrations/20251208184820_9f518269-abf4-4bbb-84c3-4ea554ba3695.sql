-- Ajouter le rôle admin à Ludovic Coycault (user_id: 9f56dce4-1529-4413-aa58-3a9cc8595aa1)
INSERT INTO public.user_roles (user_id, role) 
VALUES ('9f56dce4-1529-4413-aa58-3a9cc8595aa1', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;