// ================== 认证与档案 ==================
export type UserRole = 'user' | 'admin';

export interface Profile {
  id: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// ================== 用户分组 ==================
export interface UserGroup {
  id: string;
  name: string;
  display_name: string | null;
  rate_multiplier: number;
  allowed_models: string[];
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ================== 下游用户 ==================
export type RelayUserStatus = 'active' | 'disabled';

export interface RelayUser {
  id: string;
  username: string;
  display_name: string | null;
  email: string | null;
  group_id: string;
  balance: number;
  total_consumed: number;
  quota_limit: number | null;
  status: RelayUserStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user_groups?: UserGroup | null;
}

// ================== API Key ==================
export type ApiKeyStatus = 'active' | 'disabled';

export interface ApiKey {
  id: string;
  name: string;
  user_id: string;
  key_prefix: string;
  key_suffix: string;
  key_hash: string;
  quota_limit: number | null;
  used_quota: number;
  status: ApiKeyStatus;
  expires_at: string | null;
  last_used_at: string | null;
  request_count: number;
  created_at: string;
  updated_at: string;
  relay_users?: { username: string; display_name: string | null } | null;
}

// ================== 上游渠道 ==================
export type ChannelType = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'custom';
export type ChannelStatus = 'active' | 'disabled' | 'cooldown';
export type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

export interface Channel {
  id: string;
  name: string;
  channel_type: ChannelType;
  base_url: string;
  upstream_key_secret: string;
  key_masked: string;
  models: string[];
  model_mapping: Record<string, string>;
  priority: number;
  weight: number;
  rate_multiplier: number;
  status: ChannelStatus;
  failure_count: number;
  fail_threshold: number;
  cooldown_seconds: number;
  cooldown_until: string | null;
  total_requests: number;
  success_count: number;
  last_health_check: string | null;
  health_status: HealthStatus;
  latency_ms: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// ================== 模型 ==================
export interface ModelInfo {
  id: string;
  name: string;
  display_name: string | null;
  provider: string;
  input_price: number;
  output_price: number;
  model_rate: number;
  is_public: boolean;
  description: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

// ================== 模型别名 ==================
export interface ModelAlias {
  id: string;
  client_model: string;
  upstream_model: string;
  note: string | null;
  created_at: string;
}

// ================== 消费流水 ==================
export type UsageStatus = 'success' | 'failed' | 'refunded';

export interface UsageLog {
  id: string;
  relay_user_id: string;
  api_key_id: string | null;
  model: string;
  upstream_model: string | null;
  channel_id: string | null;
  channel_name: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  pre_deducted: number;
  amount: number;
  refund_amount: number;
  status: UsageStatus;
  http_status: number | null;
  error_code: string | null;
  latency_ms: number | null;
  stream: boolean;
  created_at: string;
  relay_users?: { username: string; display_name: string | null } | null;
  api_keys?: { name: string; key_prefix: string; key_suffix: string } | null;
}

// ================== 价格版本 ==================
export interface PriceVersion {
  id: string;
  version: string;
  target_type: 'model' | 'group';
  target_name: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown>;
  note: string | null;
  created_at: string;
}

// ================== 安全基线 ==================
export interface SecurityBaseline {
  id: string;
  category: string;
  title: string;
  description: string;
  config_guide: string | null;
  severity: 'critical' | 'high' | 'medium' | 'low';
  is_enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ================== 仪表盘统计 ==================
export interface DashboardStats {
  todayRequests: number;
  todayTokens: number;
  todayAmount: number;
  successRate: number;
  onlineChannels: number;
  totalChannels: number;
  activeUsers: number;
}

export interface TrendPoint {
  date: string;
  requests: number;
  tokens: number;
  amount: number;
}
