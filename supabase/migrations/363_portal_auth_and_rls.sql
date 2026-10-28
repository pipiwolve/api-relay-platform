BEGIN;

-- ============ 1. relay_users 增加客户端 Auth 关联列 ============
ALTER TABLE public.relay_users ADD COLUMN auth_uid uuid;

CREATE UNIQUE INDEX idx_relay_users_auth_uid ON public.relay_users (auth_uid) WHERE auth_uid IS NOT NULL;

COMMENT ON COLUMN public.relay_users.auth_uid IS '客户端自助登录用户关联的 auth.users id（管理员代建用户为 NULL）';

-- ============ 2. Helper：当前客户端用户的 relay_users.id（SECURITY DEFINER 防 RLS 自环） ============
CREATE FUNCTION public.my_relay_user_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.relay_users WHERE auth_uid = auth.uid();
$$;

-- ============ 3. 门户注册建档（默认分组 + 初始额度 + 用户名校验，幂等） ============
CREATE FUNCTION public.portal_register(p_username text, p_display_name text)
RETURNS public.relay_users
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_existing public.relay_users;
  v_group public.user_groups;
  v_email text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'PORTAL_NO_SESSION: 请先完成登录再建档';
  END IF;

  SELECT * INTO v_existing FROM public.relay_users WHERE auth_uid = v_uid;
  IF v_existing.id IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  IF p_username !~ '^[A-Za-z0-9_]{3,32}$' THEN
    RAISE EXCEPTION 'PORTAL_BAD_USERNAME: 用户名需为 3-32 位字母/数字/下划线';
  END IF;

  IF EXISTS (SELECT 1 FROM public.relay_users WHERE username = p_username) THEN
    RAISE EXCEPTION 'PORTAL_USERNAME_TAKEN: 用户名已被占用，请更换';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  SELECT * INTO v_group FROM public.user_groups ORDER BY is_default DESC, created_at ASC LIMIT 1;

  INSERT INTO public.relay_users (auth_uid, username, display_name, email, group_id, balance, status)
  VALUES (v_uid, p_username, NULLIF(p_display_name, ''), v_email, v_group.id, 10.0, 'active')
  RETURNING * INTO v_existing;

  RETURN v_existing;
END;
$$;

-- ============ 4. 修改本人昵称（仅 display_name，余额等敏感列不可触达） ============
CREATE FUNCTION public.portal_update_profile(p_display_name text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'PORTAL_NO_SESSION: 请先登录';
  END IF;
  UPDATE public.relay_users
  SET display_name = NULLIF(p_display_name, ''), updated_at = now()
  WHERE auth_uid = auth.uid();
END;
$$;

-- ============ 5. 个人账户汇总（今日/近7日消耗按北京时间分桶） ============
CREATE FUNCTION public.portal_my_summary()
RETURNS TABLE (my_balance numeric, today_amount numeric, today_tokens bigint, week_amount numeric, week_tokens bigint, key_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH me AS (
    SELECT id, balance FROM public.relay_users WHERE auth_uid = auth.uid()
  )
  SELECT
    COALESCE((SELECT me.balance FROM me), 0),
    COALESCE((SELECT SUM(u.amount) FROM public.usage_logs u JOIN me ON u.relay_user_id = me.id
      WHERE u.status = 'success'
        AND (u.created_at AT TIME ZONE 'Asia/Shanghai') >= date_trunc('day', now() AT TIME ZONE 'Asia/Shanghai')), 0),
    COALESCE((SELECT SUM(u.input_tokens + u.output_tokens) FROM public.usage_logs u JOIN me ON u.relay_user_id = me.id
      WHERE (u.created_at AT TIME ZONE 'Asia/Shanghai') >= date_trunc('day', now() AT TIME ZONE 'Asia/Shanghai')), 0),
    COALESCE((SELECT SUM(u.amount) FROM public.usage_logs u JOIN me ON u.relay_user_id = me.id
      WHERE u.status = 'success' AND u.created_at >= now() - interval '7 days'), 0),
    COALESCE((SELECT SUM(u.input_tokens + u.output_tokens) FROM public.usage_logs u JOIN me ON u.relay_user_id = me.id
      WHERE u.created_at >= now() - interval '7 days'), 0),
    COALESCE((SELECT COUNT(*) FROM public.api_keys k JOIN me ON k.user_id = me.id), 0)
  END;
$$;

-- ============ 6. 个人近 N 日按天趋势（北京时间分桶，LEFT JOIN 已限定单日） ============
CREATE FUNCTION public.portal_my_trend(p_days int DEFAULT 7)
RETURNS TABLE (day date, tokens bigint, requests bigint, amount numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT d::date AS day,
    COALESCE(SUM(u.input_tokens + u.output_tokens), 0)::bigint AS tokens,
    COUNT(u.id)::bigint AS requests,
    COALESCE(SUM(u.amount) FILTER (WHERE u.status = 'success'), 0)::numeric AS amount
  FROM generate_series(
    date_trunc('day', now() AT TIME ZONE 'Asia/Shanghai') - ((GREATEST(p_days, 1) - 1) * interval '1 day'),
    date_trunc('day', now() AT TIME ZONE 'Asia/Shanghai'),
    interval '1 day'
  ) d
  LEFT JOIN public.usage_logs u
    ON u.relay_user_id = (SELECT id FROM public.relay_users WHERE auth_uid = auth.uid())
    AND (u.created_at AT TIME ZONE 'Asia/Shanghai') >= d
    AND (u.created_at AT TIME ZONE 'Asia/Shanghai') < d + interval '1 day'
  GROUP BY d
  ORDER BY d;
$$;

-- ============ 7. 本人所属分组（倍率与模型白名单） ============
CREATE FUNCTION public.portal_my_group()
RETURNS TABLE (id uuid, name text, display_name text, rate_multiplier numeric, allowed_models text[], description text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT g.id, g.name, g.display_name, g.rate_multiplier, g.allowed_models, g.description
  FROM public.user_groups g
  JOIN public.relay_users r ON r.group_id = g.id
  WHERE r.auth_uid = auth.uid();
$$;

-- ============ 8. 当前分组可用模型（白名单为空 = 全部公开模型） ============
CREATE FUNCTION public.portal_available_models()
RETURNS TABLE (name text, display_name text, provider text, input_price numeric, output_price numeric, model_rate numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT m.name, m.display_name, m.provider, m.input_price, m.output_price, m.model_rate
  FROM public.models m
  WHERE m.is_public
    AND (
      m.name = ANY (
        SELECT unnest(g.allowed_models) FROM public.user_groups g
        JOIN public.relay_users r ON r.group_id = g.id
        WHERE r.auth_uid = auth.uid()
      )
      OR NOT EXISTS (
        SELECT 1 FROM public.user_groups g
        JOIN public.relay_users r ON r.group_id = g.id
        WHERE r.auth_uid = auth.uid() AND cardinality(g.allowed_models) > 0
      )
    )
  ORDER BY m.provider, m.name;
$$;

-- ============ 9. 客户端自助访问 RLS（与既有 admin 策略并存） ============
-- relay_users：客户端只读自己的行（写入一律经 SECURITY DEFINER RPC）
CREATE POLICY "Clients view own relay profile" ON public.relay_users
  FOR SELECT TO authenticated USING (auth_uid = auth.uid());

-- api_keys：客户端查看/创建/更新/删除仅限本人 Key（INSERT 已配套 SELECT）
CREATE POLICY "Clients view own api keys" ON public.api_keys
  FOR SELECT TO authenticated USING (user_id = public.my_relay_user_id());

CREATE POLICY "Clients create own api keys" ON public.api_keys
  FOR INSERT TO authenticated WITH CHECK (user_id = public.my_relay_user_id());

CREATE POLICY "Clients update own api keys" ON public.api_keys
  FOR UPDATE TO authenticated
  USING (user_id = public.my_relay_user_id())
  WITH CHECK (user_id = public.my_relay_user_id());

CREATE POLICY "Clients delete own api keys" ON public.api_keys
  FOR DELETE TO authenticated USING (user_id = public.my_relay_user_id());

-- usage_logs：客户端只读自己的流水（日志不可篡改）
CREATE POLICY "Clients view own usage logs" ON public.usage_logs
  FOR SELECT TO authenticated USING (relay_user_id = public.my_relay_user_id());

COMMIT;