-- Clears the oversized profile image out of auth.user_metadata.

update auth.users
set
  raw_user_meta_data = coalesce(
    (raw_user_meta_data - 'doctor_profile') ||
    (
      case
        when jsonb_typeof(raw_user_meta_data -> 'doctor_profile') = 'object'
          then jsonb_build_object(
            'doctor_profile',
            (raw_user_meta_data -> 'doctor_profile') - 'avatar_url'
          )
        else '{}'::jsonb
      end
    ),
    '{}'::jsonb
  )
where
  raw_user_meta_data -> 'doctor_profile' ? 'avatar_url'
  and (raw_user_meta_data -> 'doctor_profile' ->> 'avatar_url') like 'data:%';

-- Verification: every remaining value must be short text, not a data URL.
select
  id,
  email,
  length(raw_user_meta_data::text) as metadata_bytes,
  left(raw_user_meta_data -> 'doctor_profile' ->> 'avatar_url', 40) as avatar
from auth.users
where raw_user_meta_data ? 'doctor_profile';
