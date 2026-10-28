-- 余额调整（原子操作，防止负余额）
CREATE OR REPLACE FUNCTION public.adjust_user_balance(p_user_id uuid, p_delta numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_new_balance numeric;
BEGIN
  UPDATE public.relay_users
  SET balance = balance + p_delta,
      updated_at = now()
  WHERE id = p_user_id
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION '用户不存在';
  END IF;

  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'BALANCE_NEGATIVE';
  END IF;

  RETURN true;
END;
$$;

-- 渠道健康检查：基于近 7 天流水重算成功率与延迟
CREATE OR REPLACE FUNCTION public.check_channel_health(p_channel_id uuid)
RETURNS public.channels
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_total int;
  v_success int;
  v_avg_latency int;
  v_rate numeric;
  v_new_status text;
  v_row public.channels%ROWTYPE;
BEGIN
  SELECT count(*)::int, count(*) FILTER (WHERE status = 'success')::int
  INTO v_total, v_success
  FROM public.usage_logs
  WHERE channel_id = p_channel_id
    AND created_at > now() - interval '7 days';

  SELECT round(avg(latency_ms))::int INTO v_avg_latency
  FROM public.usage_logs
  WHERE channel_id = p_channel_id
    AND created_at > interval '7 days' * 0 + now() - interval '7 days';

  v_rate := CASE WHEN v_total > 0 THEN v_success::numeric / v_total ELSE NULL END;

  v_new_status := CASE
    WHEN v_rate IS NULL THEN 'unknown'
    WHEN v_rate >= 0.98 THEN 'healthy'
    WHEN v_rate >= 0.90 THEN 'degraded'
    ELSE 'down'
  END;

  UPDATE public.channels
  SET last_health_check = now(),
      health_status = v_new_status,
      latency_ms = v_avg_latency,
      failure_count = 0,
      updated_at = now()
  WHERE id = p_channel_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- 统计：按模型
CREATE OR REPLACE FUNCTION public.stats_by_model(p_days int DEFAULT 7)
RETURNS TABLE (model text, requests bigint, tokens bigint, amount numeric)
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT ul.model,
         count(*) AS requests,
         sum(ul.total_tokens)::bigint AS tokens,
         sum(ul.amount)::numeric AS amount
  FROM public.usage_logs ul
  WHERE ul.created_at >= date_trunc('day', now()) - ((p_days - 1) || ' days')::interval
  GROUP BY ul.model
  ORDER BY amount DESC;
$$;

-- 统计：按渠道
CREATE OR REPLACE FUNCTION public.stats_by_channel(p_days int DEFAULT 7)
RETURNS TABLE (channel_name text, requests bigint, success bigint, amount numeric)
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT ul.channel_name,
         count(*) AS requests,
         count(*) FILTER (WHERE ul.status = 'success')::bigint AS success,
         sum(ul.amount)::numeric AS amount
  FROM public.usage_logs ul
  WHERE ul.created_at >= date_trunc('day', now()) - ((p_days - 1) || ' days')::interval
  GROUP BY ul.channel_name
  ORDER BY requests DESC;
$$;

-- 统计：按用户
CREATE OR REPLACE FUNCTION public.stats_by_user(p_days int DEFAULT 7)
RETURNS TABLE (username text, display_name text, requests bigint, tokens bigint, amount numeric)
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT ru.username,
         ru.display_name,
         count(*) AS requests,
         sum(ul.total_tokens)::bigint AS tokens,
         sum(ul.amount)::numeric AS amount
  FROM public.usage_logs ul
  JOIN public.relay_users ru ON ru.id = ul.relay_user_id
  WHERE ul.created_at >= date_trunc('day', now()) - ((p_days - 1) || ' days')::interval
  GROUP BY ru.username, ru.display_name
  ORDER BY amount DESC;
$$;