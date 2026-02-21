-- Change default content status to 'draft' for pre-publication moderation
ALTER TABLE public.content ALTER COLUMN status SET DEFAULT 'draft'::content_status;