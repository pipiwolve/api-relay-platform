-- ============================================================
-- AI API 中转运营管理平台 - 数据库 Schema
-- ============================================================

-- 1. 管理员角色与档案
CREATE TYPE public.user_role AS ENUM ('user', 'admin');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  email text,
  phone text,
  role public.user_role NOT NULL DEFAULT 'user'::public.user_role,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, role)
  VALUES (NEW.id, NEW.email, NEW.phone, 'user'::public.user_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.get_user_role(uid uuid)
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = uid;
$$;

-- 2. 用户分组
CREATE TABLE public.user_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text,
  rate_multiplier numeric NOT NULL DEFAULT 1.0,
  allowed_models text[] NOT NULL DEFAULT '{}',
  description text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. 下游用户（持站内签发 Key 的租户，与管理员 auth 体系分离）
CREATE TABLE public.relay_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  display_name text,
  email text,
  group_id uuid NOT NULL REFERENCES public.user_groups(id) ON DELETE RESTRICT,
  balance numeric(18,6) NOT NULL DEFAULT 0,
  total_consumed numeric(18,6) NOT NULL DEFAULT 0,
  quota_limit numeric(18,6),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. API Key（仅存摘要）
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.relay_users(id) ON DELETE CASCADE,
  key_prefix text NOT NULL,
  key_suffix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  quota_limit numeric(18,6),
  used_quota numeric(18,6) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  expires_at timestamptz,
  last_used_at timestamptz,
  request_count bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. 上游渠道
CREATE TABLE public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  channel_type text NOT NULL CHECK (channel_type IN ('openai','anthropic','gemini','deepseek','custom')),
  base_url text NOT NULL,
  upstream_key_secret text NOT NULL,
  key_masked text NOT NULL,
  models text[] NOT NULL DEFAULT '{}',
  model_mapping jsonb NOT NULL DEFAULT '{}',
  priority int NOT NULL DEFAULT 10,
  weight int NOT NULL DEFAULT 1,
  rate_multiplier numeric NOT NULL DEFAULT 1.0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','cooldown')),
  failure_count int NOT NULL DEFAULT 0,
  fail_threshold int NOT NULL DEFAULT 3,
  cooldown_seconds int NOT NULL DEFAULT 300,
  cooldown_until timestamptz,
  total_requests bigint NOT NULL DEFAULT 0,
  success_count bigint NOT NULL DEFAULT 0,
  last_health_check timestamptz,
  health_status text NOT NULL DEFAULT 'unknown' CHECK (health_status IN ('healthy','degraded','down','unknown')),
  latency_ms int,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. 模型清单
CREATE TABLE public.models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text,
  provider text NOT NULL,
  input_price numeric(18,8) NOT NULL DEFAULT 0,
  output_price numeric(18,8) NOT NULL DEFAULT 0,
  model_rate numeric NOT NULL DEFAULT 1.0,
  is_public boolean NOT NULL DEFAULT true,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 7. 模型别名映射（客户端模型名 -> 渠道模型名）
CREATE TABLE public.model_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_model text NOT NULL UNIQUE,
  upstream_model text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. 消费流水
CREATE TABLE public.usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relay_user_id uuid NOT NULL REFERENCES public.relay_users(id) ON DELETE CASCADE,
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  model text NOT NULL,
  upstream_model text,
  channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL,
  channel_name text NOT NULL,
  input_tokens int NOT NULL DEFAULT 0,
  output_tokens int NOT NULL DEFAULT 0,
  total_tokens int GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  pre_deducted numeric(18,6) NOT NULL DEFAULT 0,
  amount numeric(18,6) NOT NULL DEFAULT 0,
  refund_amount numeric(18,6) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success','failed','refunded')),
  http_status int,
  error_code text,
  latency_ms int,
  stream boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 9. 价格版本记录
CREATE TABLE public.price_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('model','group')),
  target_name text NOT NULL,
  old_value jsonb,
  new_value jsonb NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. 安全基线检查项
CREATE TABLE public.security_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  config_guide text,
  severity text NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  is_enabled boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX idx_usage_logs_created_at ON public.usage_logs (created_at DESC);
CREATE INDEX idx_usage_logs_user ON public.usage_logs (relay_user_id);
CREATE INDEX idx_usage_logs_channel ON public.usage_logs (channel_id);
CREATE INDEX idx_usage_logs_model ON public.usage_logs (model);
CREATE INDEX idx_api_keys_user ON public.api_keys (user_id);

-- ============================================================
-- RLS 策略
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relay_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin'::public.user_role)
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin'::public.user_role);
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM public.get_user_role(auth.uid()));

CREATE POLICY "Admins manage user_groups" ON public.user_groups
  FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin'::public.user_role)
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin'::public.user_role);

CREATE POLICY "Admins manage relay_users" ON public.relay_users
  FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin'::public.user_role)
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin'::public.user_role);

CREATE POLICY "Admins manage api_keys" ON public.api_keys
  FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin'::public.user_role)
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin'::public.user_role);

CREATE POLICY "Admins manage channels" ON public.channels
  FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin'::public.user_role)
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin'::public.user_role);

CREATE POLICY "Admins manage models" ON public.models
  FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin'::public.user_role)
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin'::public.user_role);

CREATE POLICY "Admins manage model_aliases" ON public.model_aliases
  FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin'::public.user_role)
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin'::public.user_role);

CREATE POLICY "Admins manage usage_logs" ON public.usage_logs
  FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin'::public.user_role)
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin'::public.user_role);

CREATE POLICY "Admins manage price_versions" ON public.price_versions
  FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin'::public.user_role)
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin'::public.user_role);

CREATE POLICY "Admins manage security_baselines" ON public.security_baselines
  FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin'::public.user_role)
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin'::public.user_role);

-- ============================================================
-- 种子数据
-- ============================================================
INSERT INTO public.user_groups (name, display_name, rate_multiplier, allowed_models, description, is_default) VALUES
  ('default', '默认分组', 1.0, '{}', '平台默认分组，可访问全部开放模型，标准计费倍率', true),
  ('premium', '高级客户', 0.8, '{}', '签约企业客户，享受 8 折计费倍率', false),
  ('trial', '试用分组', 1.5, '{gpt-4o-mini,deepseek-chat,gemini-1.5-flash}', '新用户试用分组，仅开放基础模型，计费倍率 1.5', false);

INSERT INTO public.channels (name, channel_type, base_url, upstream_key_secret, key_masked, models, model_mapping, priority, weight, rate_multiplier, status, health_status, description) VALUES
  ('OpenAI 官方', 'openai', 'https://api.openai.com/v1', 'vault:enc:a8f3d2c1b9e4765023814fae9b7c2d10', 'sk-****e21c', '{gpt-4o,gpt-4o-mini,gpt-4-turbo}', '{}', 1, 10, 1.0, 'active', 'healthy', 'OpenAI 官方直连渠道，主力模型 gpt-4o 系列'),
  ('Anthropic 官方', 'anthropic', 'https://api.anthropic.com', 'vault:enc:7b2d94e5c1a8f30629d5b7e4c8a1f923', 'sk-ant-****9f4a', '{claude-3-5-sonnet-latest,claude-3-haiku-latest}', '{}', 2, 5, 1.0, 'active', 'healthy', 'Anthropic Claude 系列官方渠道'),
  ('Google Gemini', 'gemini', 'https://generativelanguage.googleapis.com/v1beta', 'vault:enc:c4e9a1b7f2d8350618294e7c3a5b0d9f', 'AIza****a1b7', '{gemini-1.5-pro,gemini-1.5-flash}', '{}', 3, 5, 0.9, 'active', 'healthy', 'Google Gemini 渠道，费率 9 折'),
  ('DeepSeek 官方', 'deepseek', 'https://api.deepseek.com/v1', 'vault:enc:d2f8c3e5a9b1476028351c4e7d9a2f08', 'sk-****c3e5', '{deepseek-chat,deepseek-reasoner}', '{}', 1, 8, 0.5, 'active', 'healthy', 'DeepSeek 高性价比渠道，费率 5 折'),
  ('Azure OpenAI（预留）', 'custom', 'https://azure-gpt.example.com/openai/v1', 'vault:enc:91a4f7d2b3c8e5061927a4d8c2e6b9f1', 'sk-****f7d2', '{gpt-4o,gpt-4o-mini}', '{"gpt-4o":"azure-gpt4o-2024-08"}', 4, 3, 1.2, 'disabled', 'unknown', 'Azure OpenAI 兼容端点，容量预留，默认停用');

INSERT INTO public.models (name, display_name, provider, input_price, output_price, model_rate, is_public, description) VALUES
  ('gpt-4o', 'GPT-4o', 'openai', 2.50000000, 10.00000000, 1.0, true, 'OpenAI 旗舰多模态模型'),
  ('gpt-4o-mini', 'GPT-4o mini', 'openai', 0.15000000, 0.60000000, 1.0, true, '高性价比轻量模型'),
  ('gpt-4-turbo', 'GPT-4 Turbo', 'openai', 10.00000000, 30.00000000, 1.0, true, '上一代旗舰模型'),
  ('claude-3-5-sonnet-latest', 'Claude 3.5 Sonnet', 'anthropic', 3.00000000, 15.00000000, 1.0, true, 'Anthropic 均衡旗舰模型'),
  ('claude-3-haiku-latest', 'Claude 3 Haiku', 'anthropic', 0.25000000, 1.25000000, 1.0, true, 'Anthropic 轻量高速模型'),
  ('gemini-1.5-pro', 'Gemini 1.5 Pro', 'gemini', 1.25000000, 5.00000000, 1.0, true, 'Google 长上下文旗舰'),
  ('gemini-1.5-flash', 'Gemini 1.5 Flash', 'gemini', 0.07500000, 0.30000000, 1.0, true, 'Google 超高速轻量模型'),
  ('deepseek-chat', 'DeepSeek Chat', 'deepseek', 0.27000000, 1.10000000, 1.0, true, 'DeepSeek V3 对话模型'),
  ('deepseek-reasoner', 'DeepSeek Reasoner', 'deepseek', 0.55000000, 2.19000000, 1.0, true, 'DeepSeek R1 推理模型');

INSERT INTO public.model_aliases (client_model, upstream_model, note) VALUES
  ('gpt-4', 'gpt-4o', '旧版名称自动升级到 gpt-4o'),
  ('gpt-35-turbo', 'gpt-4o-mini', '老客户兼容映射'),
  ('claude-3-sonnet', 'claude-3-5-sonnet-latest', 'Claude 3 Sonnet 升级映射'),
  ('gemini-pro', 'gemini-1.5-pro', 'Gemini Pro 简称映射'),
  ('deepseek-v3', 'deepseek-chat', 'DeepSeek V3 别名映射');

INSERT INTO public.relay_users (username, display_name, email, group_id, balance, total_consumed, quota_limit, status, notes) VALUES
  ('acme-tech', 'Acme 科技', 'ops@acme-tech.example.com', (SELECT id FROM public.user_groups WHERE name='premium'), 2580.500000, 0, 5000.000000, 'active', '企业客户，月度对账'),
  ('dev-zhang', '张开发者', 'zhang.dev@example.com', (SELECT id FROM public.user_groups WHERE name='default'), 186.320000, 0, NULL, 'active', '个人开发者'),
  ('test-li', '李测试', 'li.test@example.com', (SELECT id FROM public.user_groups WHERE name='trial'), 9.440000, 0, 20.000000, 'active', '试用用户'),
  ('startup-wang', '王创业', 'wang@startup.example.com', (SELECT id FROM public.user_groups WHERE name='default'), 42.180000, 0, NULL, 'disabled', '欠费暂停，恢复缴费后启用');

INSERT INTO public.api_keys (name, user_id, key_prefix, key_suffix, key_hash, quota_limit, status, expires_at) VALUES
  ('生产环境 Key', (SELECT id FROM public.relay_users WHERE username='acme-tech'), 'sk-relay-9f2a', 'e83b', 'a3f5c8d9e1b4720658391fa4b7c2d0e9581237ac4b6d8e0f192a3b5c7d9e1f24', NULL, 'active', NULL),
  ('CI 测试 Key', (SELECT id FROM public.relay_users WHERE username='acme-tech'), 'sk-relay-3c7d', 'a19f', 'b8e2d4f6a0c1357924680ace13579bdf02468ace13579bdf02468ace13579bd', NULL, 'active', now() + interval '90 days'),
  ('个人开发 Key', (SELECT id FROM public.relay_users WHERE username='dev-zhang'), 'sk-relay-7e1b', 'c402', 'c9d1e3f5a2b0468025791bdf0468ace24680ace24680ace24680ace2468ace24', NULL, 'active', NULL),
  ('试用体验 Key', (SELECT id FROM public.relay_users WHERE username='test-li'), 'sk-relay-5d8e', 'b735', 'd0e2f4a6b3c157913680ace157913680ace157913680ace157913680ace15', NULL, 'disabled', now() + interval '30 days');

INSERT INTO public.price_versions (version, target_type, target_name, old_value, new_value, note) VALUES
  ('v1.0.0', 'model', 'gpt-4o', NULL, '{"input_price": 2.5, "output_price": 10.0, "model_rate": 1.0}', '初始定价：GPT-4o 上线'),
  ('v1.1.0', 'model', 'deepseek-chat', '{"input_price": 0.55, "output_price": 2.19}', '{"input_price": 0.27, "output_price": 1.10}', 'DeepSeek 官方降价同步'),
  ('v1.2.0', 'group', 'premium', '{"rate_multiplier": 0.9}', '{"rate_multiplier": 0.8}', '高级客户倍率由 9 折调整为 8 折'),
  ('v1.2.1', 'model', 'gpt-4o-mini', NULL, '{"input_price": 0.15, "output_price": 0.6, "model_rate": 1.0}', '新增开放模型 gpt-4o-mini'),
  ('v1.3.0', 'group', 'trial', '{"rate_multiplier": 1.2}', '{"rate_multiplier": 1.5}', '试用分组倍率上调，抑制滥用');

INSERT INTO public.security_baselines (category, title, description, config_guide, severity, is_enabled, sort_order) VALUES
  ('网络架构', '管理面与业务面分离', '管理后台与中转 API 端点部署在不同域名与网络分区，管理面仅允许办公网/VPN 访问，业务面面向公网开放。', '将 admin.example.com 与 api.example.com 分别部署；管理面入口前置 IP 白名单或 WireGuard；业务面仅暴露 /v1/* 路由。', 'critical', true, 1),
  ('密钥安全', 'API Key 仅存不可逆摘要', '站内签发的 API Key 明文仅在签发时展示一次，数据库仅保存 SHA-256 摘要与前后缀，数据库泄露无法还原 Key。', '签发时前端生成 Key 并计算 SHA-256，仅将摘要提交后端存储；登录后台时通过 key_hash 精确匹配校验。', 'critical', true, 2),
  ('日志安全', '日志脱敏（不记录 Authorization 与完整 prompt/response）', '消费流水仅记录用量、金额、状态码等元数据，不落库 Authorization 头、请求体与响应体原文，防止敏感内容泄露。', '中转层日志白名单化：仅记录 model/tokens/usage/latency/status；对上游错误信息做截断与脱敏后再入日志表。', 'critical', true, 3),
  ('多租户', '租户与分组隔离', '用户、Key、额度、流水按租户严格隔离，分组白名单决定可见模型与渠道，跨租户数据不可见。', '所有查询强制携带 relay_user_id 过滤；分组模型白名单在网关层校验，越权请求返回 403。', 'high', true, 4),
  ('可用性', 'Fail-Closed 故障降级', '所有上游渠道不可用或处于冷却期时拒绝新请求并返回 503，而不是放行到不确定的上游，防止计费与数据异常。', '渠道选择器在候选集为空时直接返回 503 NO_CHANNEL；冷却期渠道自动剔除，健康探测通过后自动恢复。', 'high', true, 5),
  ('密钥安全', '上游渠道密钥加密存储', '上游 Key 使用 KMS/Vault 加密后存储，运行时解密使用，数据库泄露无法直接拿到上游明文 Key。', '接入 Supabase Vault 或云 KMS；Edge Function 运行时通过密钥引用解密，禁止将明文写入日志。', 'high', false, 6),
  ('传输安全', '全链路 HTTPS/TLS 加密', '客户端到中转站、中转站到上游全程 TLS 1.2+ 加密，禁用明文 HTTP 回退。', '网关强制 HSTS；上游仅允许 https:// 地址；自定义渠道校验证书链。', 'medium', true, 7),
  ('认证安全', '管理后台双因素认证（2FA）', '管理员账号开启 TOTP 双因素认证，降低凭据泄露后的横向移动风险。', '为管理员账号绑定 TOTP 应用；登录后校验动态口令；异地登录触发告警。', 'medium', false, 8),
  ('限流防护', '请求频率限制与并发控制', '按 Key 维度配置 RPM/TPM 限流，超限返回 429，防止滥用与资源耗尽。', '网关按 Key 配置每分钟请求数与 Token 数上限；突发流量进入排队而非直接透传。', 'medium', true, 9),
  ('密钥安全', '密钥轮换与到期策略', 'API Key 支持设置到期时间与不使用自动轮换，长期未使用的 Key 自动禁用。', '签发 Key 时设置 expires_at；超过 90 天未使用的 Key 自动置为禁用并发送通知。', 'low', false, 10);

-- ============================================================
-- 模拟近 7 天消费流水（用于图表展示）
-- ============================================================
CREATE OR REPLACE FUNCTION public.seed_usage_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  d int; i int; cnt int;
  v_user record; v_channel record; v_model record;
  v_group_rate numeric;
  in_toks int; out_toks int; amt numeric; pre numeric;
  ok boolean; hstat int; lat int; strm boolean; ts timestamptz; err text;
  v_key uuid;
BEGIN
  FOR d IN REVERSE 6..0 LOOP
    cnt := 70 + floor(random() * 80)::int;
    FOR i IN 1..cnt LOOP
      SELECT * INTO v_user FROM public.relay_users WHERE status = 'active' ORDER BY random() LIMIT 1;
      SELECT m.* INTO v_model FROM public.models m
        WHERE m.status = 'active' AND EXISTS (
          SELECT 1 FROM public.channels c WHERE c.status <> 'disabled' AND m.name = ANY(c.models))
        ORDER BY random() LIMIT 1;
      SELECT * INTO v_channel FROM public.channels c
        WHERE c.status <> 'disabled' AND v_model.name = ANY(c.models)
        ORDER BY random() LIMIT 1;
      SELECT g.rate_multiplier INTO v_group_rate FROM public.user_groups g WHERE g.id = v_user.group_id;
      SELECT k.id INTO v_key FROM public.api_keys k WHERE k.user_id = v_user.id ORDER BY k.created_at LIMIT 1;

      in_toks := 200 + floor(random() * 4800)::int;
      out_toks := 80 + floor(random() * 2400)::int;
      amt := round((in_toks * v_model.input_price + out_toks * v_model.output_price) / 1000000 * v_model.model_rate * v_group_rate * v_channel.rate_multiplier, 6);
      pre := round((amt * (1.2 + random() * 0.5))::numeric, 6);
      ok := random() < 0.94;
      hstat := CASE WHEN ok THEN 200 ELSE (ARRAY[500,502,503,429])[1 + floor(random() * 4)::int] END;
      err := CASE WHEN ok THEN NULL ELSE (ARRAY['UPSTREAM_ERROR','UPSTREAM_TIMEOUT','NO_CHANNEL','RATE_LIMITED'])[1 + floor(random() * 4)::int] END;
      lat := 280 + floor(random() * 4200)::int;
      strm := random() < 0.4;
      ts := date_trunc('day', now()) - (d || ' days')::interval + (floor(random() * 86400) * interval '1 second');

      INSERT INTO public.usage_logs (relay_user_id, api_key_id, model, upstream_model, channel_id, channel_name,
        input_tokens, output_tokens, pre_deducted, amount, refund_amount, status, http_status, error_code, latency_ms, stream, created_at)
      VALUES (v_user.id, v_key, v_model.name, v_model.name, v_channel.id, v_channel.name,
        in_toks, out_toks,
        pre,
        CASE WHEN ok THEN amt ELSE 0 END,
        CASE WHEN ok THEN 0 ELSE pre END,
        CASE WHEN ok THEN 'success' ELSE 'refunded' END,
        hstat, err, lat, strm, ts);
    END LOOP;
  END LOOP;
END;
$$;

SELECT public.seed_usage_logs();
DROP FUNCTION public.seed_usage_logs();

-- 回填统计字段
UPDATE public.api_keys k SET
  request_count = COALESCE((SELECT count(*) FROM public.usage_logs ul WHERE ul.api_key_id = k.id), 0),
  used_quota = COALESCE((SELECT sum(ul.amount) FROM public.usage_logs ul WHERE ul.api_key_id = k.id), 0),
  last_used_at = (SELECT max(ul.created_at) FROM public.usage_logs ul WHERE ul.api_key_id = k.id);

UPDATE public.relay_users ru SET
  total_consumed = COALESCE((SELECT sum(ul.amount) FROM public.usage_logs ul WHERE ul.relay_user_id = ru.id), 0);

UPDATE public.channels c SET
  total_requests = COALESCE((SELECT count(*) FROM public.usage_logs ul WHERE ul.channel_id = c.id), 0),
  success_count = COALESCE((SELECT count(*) FROM public.usage_logs ul WHERE ul.channel_id = c.id AND ul.status = 'success'), 0),
  latency_ms = COALESCE((SELECT round(avg(ul.latency_ms))::int FROM public.usage_logs ul WHERE ul.channel_id = c.id), NULL),
  last_health_check = now(),
  health_status = CASE WHEN c.status = 'disabled' THEN 'unknown' ELSE 'healthy' END
WHERE c.status <> 'cooldown';