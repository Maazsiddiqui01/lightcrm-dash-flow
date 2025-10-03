-- Grant admin role to the current user
INSERT INTO public.user_roles (user_id, role)
VALUES ('b67dc350-2408-40bf-b06e-08c1d31e9df7', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;