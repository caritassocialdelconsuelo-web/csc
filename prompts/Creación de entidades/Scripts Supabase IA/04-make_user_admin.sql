UPDATE auth.users 
SET raw_app_meta_data = raw_app_meta_data || '{"is_admin": true}'::jsonb
WHERE email = 'cellipablo@gmail.com';