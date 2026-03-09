CREATE OR REPLACE FUNCTION public.util_safe_timestamptz(input text)
  RETURNS timestamptz
  LANGUAGE plpgsql
  IMMUTABLE
AS $$
BEGIN
  IF input IS NULL OR trim(input) = '' THEN
    RETURN NULL;
  END IF;
  RETURN input::timestamptz;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.util_year_text(input text)
  RETURNS text
  LANGUAGE plpgsql
  IMMUTABLE
AS $$
DECLARE
  ts timestamptz;
BEGIN
  ts := public.util_safe_timestamptz(input);
  IF ts IS NULL THEN RETURN NULL; END IF;
  RETURN extract(year from ts)::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.util_quarter_text(input text)
  RETURNS text
  LANGUAGE plpgsql
  IMMUTABLE
AS $$
DECLARE
  ts timestamptz;
BEGIN
  ts := public.util_safe_timestamptz(input);
  IF ts IS NULL THEN RETURN NULL; END IF;
  RETURN 'Q' || extract(quarter from ts)::text || ' ' || extract(year from ts)::text;
END;
$$;