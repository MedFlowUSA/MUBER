-- Preserve exact-key validation with portable key enumeration.
create or replace function public.valid_weekly_operating_hours(p_hours jsonb) returns boolean language plpgsql immutable as $$
declare v_day text;v_intervals jsonb;v_interval jsonb;v_start text;v_end text;v_previous_end text;v_key_count int;
begin
  if jsonb_typeof(p_hours) is distinct from 'object'
    or p_hours->>'timezone' is distinct from 'America/Los_Angeles'
    or jsonb_typeof(p_hours->'days') is distinct from 'object'
  then return false;end if;
  select count(*) into v_key_count from jsonb_object_keys(p_hours);
  if v_key_count<>2 then return false;end if;
  select count(*) into v_key_count from jsonb_object_keys(p_hours->'days');
  if v_key_count<>7 then return false;end if;
  foreach v_day in array array['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] loop
    v_intervals:=p_hours->'days'->v_day;v_previous_end:=null;
    if jsonb_typeof(v_intervals) is distinct from 'array' or jsonb_array_length(v_intervals)>2 then return false;end if;
    for v_interval in select value from jsonb_array_elements(v_intervals) loop
      v_start:=v_interval->>'start';v_end:=v_interval->>'end';
      if jsonb_typeof(v_interval) is distinct from 'object' then return false;end if;
      select count(*) into v_key_count from jsonb_object_keys(v_interval);
      if v_key_count<>2
        or v_start is null
        or v_end is null
        or v_start !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        or v_end !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        or v_start>=v_end
        or (v_previous_end is not null and v_start<v_previous_end)
      then return false;end if;
      v_previous_end:=v_end;
    end loop;
  end loop;
  return true;
end $$;
