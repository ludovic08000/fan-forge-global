-- Convertir ludovic43@msn.com en créateur
INSERT INTO public.creators (user_id, subscription_price, currency)
VALUES ('f0d0dd88-0a61-45b7-992a-983eb106e9a5', 9.99, 'EUR')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
VALUES ('f0d0dd88-0a61-45b7-992a-983eb106e9a5', 'creator')
ON CONFLICT (user_id, role) DO NOTHING;