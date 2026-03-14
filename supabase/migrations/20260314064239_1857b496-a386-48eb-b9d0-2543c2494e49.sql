
-- Insert creator entry for djquake@hotmail.fr
INSERT INTO public.creators (user_id, subscription_price, gender, stage_name, category, categories)
VALUES ('94fa6c2d-1240-4f2c-bde7-7cf832b5c46d', 9.99, 'homme', 'Dj Quake', 'DJing', ARRAY['DJing'])
ON CONFLICT DO NOTHING;

-- Insert user role
INSERT INTO public.user_roles (user_id, role)
VALUES ('94fa6c2d-1240-4f2c-bde7-7cf832b5c46d', 'creator')
ON CONFLICT (user_id, role) DO NOTHING;
