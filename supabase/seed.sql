-- ============================================================
-- Seed data for initial setup
-- Run this in Supabase SQL Editor or via supabase db reset
-- ============================================================

-- 1. User Groups
INSERT INTO public.user_groups (name, display_name, rate_multiplier, allowed_models, description, is_default) VALUES
  ('default', '默认分组', 1.0, '{}', '平台默认分组，可访问全部开放模型，标准计费倍率', true),
  ('premium', '高级客户', 0.8, '{}', '签约企业客户，享受 8 折计费倍率', false),
  ('trial', '试用分组', 1.5, '{gpt-4o-mini,deepseek-chat,gemini-1.5-flash}', '新用户试用分组，仅开放基础模型，计费倍率 1.5', false)
ON CONFLICT (name) DO NOTHING;

-- 2. Models
INSERT INTO public.models (name, display_name, provider, input_price, output_price, model_rate, is_public, description) VALUES
  ('gpt-4o', 'GPT-4o', 'openai', 2.50000000, 10.00000000, 1.0, true, 'OpenAI 旗舰多模态模型'),
  ('gpt-4o-mini', 'GPT-4o mini', 'openai', 0.15000000, 0.60000000, 1.0, true, '高性价比轻量模型'),
  ('gpt-4-turbo', 'GPT-4 Turbo', 'openai', 10.00000000, 30.00000000, 1.0, true, '上一代旗舰模型'),
  ('claude-3-5-sonnet-latest', 'Claude 3.5 Sonnet', 'anthropic', 3.00000000, 15.00000000, 1.0, true, 'Anthropic 均衡旗舰模型'),
  ('claude-3-haiku-latest', 'Claude 3 Haiku', 'anthropic', 0.25000000, 1.25000000, 1.0, true, 'Anthropic 轻量高速模型'),
  ('gemini-1.5-pro', 'Gemini 1.5 Pro', 'gemini', 1.25000000, 5.00000000, 1.0, true, 'Google 长上下文旗舰'),
  ('gemini-1.5-flash', 'Gemini 1.5 Flash', 'gemini', 0.07500000, 0.30000000, 1.0, true, 'Google 超高速轻量模型'),
  ('deepseek-chat', 'DeepSeek Chat', 'deepseek', 0.27000000, 1.10000000, 1.0, true, 'DeepSeek V3 对话模型'),
  ('deepseek-reasoner', 'DeepSeek Reasoner', 'deepseek', 0.55000000, 2.19000000, 1.0, true, 'DeepSeek R1 推理模型')
ON CONFLICT (name) DO NOTHING;

-- 3. Channels
INSERT INTO public.channels (name, channel_type, base_url, upstream_key_secret, key_masked, models, model_mapping, priority, weight, rate_multiplier, status, health_status, description) VALUES
  ('OpenAI 官方', 'openai', 'https://api.openai.com/v1', 'vault:enc:a8f3d2c1b9e4765023814fae9b7c2d10', 'sk-****e21c', '{gpt-4o,gpt-4o-mini,gpt-4-turbo}', '{}', 1, 10, 1.0, 'active', 'healthy', 'OpenAI 官方直连渠道，主力模型 gpt-4o 系列'),
  ('Anthropic 官方', 'anthropic', 'https://api.anthropic.com', 'vault:enc:7b2d94e5c1a8f30629d5b7e4c8a1f923', 'sk-ant-****9f4a', '{claude-3-5-sonnet-latest,claude-3-haiku-latest}', '{}', 2, 5, 1.0, 'active', 'healthy', 'Anthropic Claude 系列官方渠道'),
  ('Google Gemini', 'gemini', 'https://generativelanguage.googleapis.com/v1beta', 'vault:enc:c4e9a1b7f2d8350618294e7c3a5b0d9f', 'AIza****a1b7', '{gemini-1.5-pro,gemini-1.5-flash}', '{}', 3, 5, 0.9, 'active', 'healthy', 'Google Gemini 渠道，费率 9 折'),
  ('DeepSeek 官方', 'deepseek', 'https://api.deepseek.com/v1', 'vault:enc:d2f8c3e5a9b1476028351c4e7d9a2f08', 'sk-****c3e5', '{deepseek-chat,deepseek-reasoner}', '{}', 1, 8, 0.5, 'active', 'healthy', 'DeepSeek 高性价比渠道，费率 5 折')
ON CONFLICT DO NOTHING;

-- 4. Model Aliases
INSERT INTO public.model_aliases (client_model, upstream_model, note) VALUES
  ('gpt-4', 'gpt-4o', '旧版名称自动升级到 gpt-4o'),
  ('gpt-35-turbo', 'gpt-4o-mini', '老客户兼容映射'),
  ('claude-3-sonnet', 'claude-3-5-sonnet-latest', 'Claude 3 Sonnet 升级映射'),
  ('gemini-pro', 'gemini-1.5-pro', 'Gemini Pro 简称映射'),
  ('deepseek-v3', 'deepseek-chat', 'DeepSeek V3 别名映射')
ON CONFLICT (client_model) DO NOTHING;

-- 5. Security Baselines
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
  ('密钥安全', '密钥轮换与到期策略', 'API Key 支持设置到期时间与不使用自动轮换，长期未使用的 Key 自动禁用。', '签发 Key 时设置 expires_at；超过 90 天未使用的 Key 自动置为禁用并发送通知。', 'low', false, 10)
ON CONFLICT DO NOTHING;

-- 6. Demo Users (optional - for testing)
INSERT INTO public.relay_users (username, display_name, email, group_id, balance, total_consumed, quota_limit, status, notes) VALUES
  ('acme-tech', 'Acme 科技', 'ops@acme-tech.example.com', (SELECT id FROM public.user_groups WHERE name='premium'), 2580.500000, 0, 5000.000000, 'active', '企业客户，月度对账'),
  ('dev-zhang', '张开发者', 'zhang.dev@example.com', (SELECT id FROM public.user_groups WHERE name='default'), 186.320000, 0, NULL, 'active', '个人开发者'),
  ('test-li', '李测试', 'li.test@example.com', (SELECT id FROM public.user_groups WHERE name='trial'), 9.440000, 0, 20.000000, 'active', '试用用户')
ON CONFLICT (username) DO NOTHING;

-- 7. Demo API Keys (optional - for testing)
INSERT INTO public.api_keys (name, user_id, key_prefix, key_suffix, key_hash, quota_limit, status, expires_at) VALUES
  ('生产环境 Key', (SELECT id FROM public.relay_users WHERE username='acme-tech'), 'sk-relay-9f2a', 'e83b', 'a3f5c8d9e1b4720658391fa4b7c2d0e9581237ac4b6d8e0f192a3b5c7d9e1f24', NULL, 'active', NULL),
  ('CI 测试 Key', (SELECT id FROM public.relay_users WHERE username='acme-tech'), 'sk-relay-3c7d', 'a19f', 'b8e2d4f6a0c1357924680ace13579bdf02468ace13579bdf02468ace13579bd', NULL, 'active', now() + interval '90 days'),
  ('个人开发 Key', (SELECT id FROM public.relay_users WHERE username='dev-zhang'), 'sk-relay-7e1b', 'c402', 'c9d1e3f5a2b0468025791bdf0468ace24680ace24680ace24680ace2468ace24', NULL, 'active', NULL)
ON CONFLICT (key_hash) DO NOTHING;

-- 8. Price Versions
INSERT INTO public.price_versions (version, target_type, target_name, old_value, new_value, note) VALUES
  ('v1.0.0', 'model', 'gpt-4o', NULL, '{"input_price": 2.5, "output_price": 10.0, "model_rate": 1.0}', '初始定价：GPT-4o 上线'),
  ('v1.1.0', 'model', 'deepseek-chat', '{"input_price": 0.55, "output_price": 2.19}', '{"input_price": 0.27, "output_price": 1.10}', 'DeepSeek 官方降价同步'),
  ('v1.2.0', 'group', 'premium', '{"rate_multiplier": 0.9}', '{"rate_multiplier": 0.8}', '高级客户倍率由 9 折调整为 8 折')
ON CONFLICT DO NOTHING;
