-- Enum values must commit before functions can safely use them in the next migration.
alter type public.job_status add value if not exists 'submitted';
alter type public.job_status add value if not exists 'needs_review';
alter type public.job_status add value if not exists 'needs_customer_information';
alter type public.job_status add value if not exists 'quote_preparation';
alter type public.job_status add value if not exists 'quote_sent';
alter type public.job_status add value if not exists 'quote_accepted';
alter type public.job_status add value if not exists 'ready_for_matching';
alter type public.job_status add value if not exists 'offer_sent';
alter type public.job_status add value if not exists 'crew_confirmed';
alter type public.job_status add value if not exists 'ready';
alter type public.job_status add value if not exists 'arrived';
alter type public.job_status add value if not exists 'completion_review';
alter type public.job_status add value if not exists 'closed';
alter type public.job_status add value if not exists 'incident_hold';
alter type public.job_status add value if not exists 'reassignment_required';
