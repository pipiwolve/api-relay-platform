import { supabase } from '@/db/supabase';
import type {
  ApiKey,
  Channel,
  DashboardStats,
  ModelAlias,
  ModelInfo,
  PriceVersion,
  RelayUser,
  SecurityBaseline,
  TrendPoint,
  UsageLog,
  UserGroup,
} from '@/types/types';

// ================== 通用工具 ==================
export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** 生成站内 API Key 明文：sk-relay-<32位随机hex> */
export function generateApiKeyPlain(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `sk-relay-${hex}`;
}

export function formatAmount(n: number | null | undefined): string {
  if (n === null || n === undefined) return '0.00';
  return n.toFixed(2);
}

export function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

// ================== 分组 ==================
export async function fetchGroups(): Promise<UserGroup[]> {
  const { data, error } = await supabase.from('user_groups').select('*').order('created_at');
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function upsertGroup(group: Partial<UserGroup>): Promise<void> {
  const { error } = await supabase.from('user_groups').upsert(group, { onConflict: 'name' });
  if (error) throw error;
}

// ================== 下游用户 ==================
export async function fetchRelayUsers(keyword?: string): Promise<RelayUser[]> {
  let query = supabase.from('relay_users').select('*, user_groups(*)').order('created_at');
  if (keyword) query = query.or(`username.ilike.%${keyword}%,display_name.ilike.%${keyword}%`);
  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function createRelayUser(user: {
  username: string;
  display_name?: string | null;
  email?: string | null;
  group_id: string;
  balance: number;
  quota_limit?: number | null;
  notes?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('relay_users').insert(user);
  if (error) throw error;
}

export async function updateRelayUser(id: string, patch: Partial<RelayUser>): Promise<void> {
  const { error } = await supabase.from('relay_users').update(patch).eq('id', id);
  if (error) throw error;
}

/** 额度充值/扣减：delta 正数为充值，负数为扣减 */
export async function adjustBalance(id: string, delta: number): Promise<void> {
  const { data, error } = await supabase.rpc('adjust_user_balance', { p_user_id: id, p_delta: delta });
  if (error) throw error;
  if (data === false) throw new Error('余额不足，无法扣减该数额');
}

export async function deleteRelayUser(id: string): Promise<void> {
  const { error } = await supabase.from('relay_users').delete().eq('id', id);
  if (error) throw error;
}

// ================== API Key ==================
export async function fetchApiKeys(keyword?: string): Promise<ApiKey[]> {
  let query = supabase
    .from('api_keys')
    .select('*, relay_users(username, display_name)')
    .order('created_at');
  if (keyword) query = query.or(`name.ilike.%${keyword}%,key_prefix.ilike.%${keyword}%`);
  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

/** 签发 Key：前端生成明文，仅提交摘要入库，明文只在返回值中出现一次 */
export async function issueApiKey(params: {
  name: string;
  user_id: string;
  quota_limit?: number | null;
  expires_at?: string | null;
}): Promise<{ plain: string }> {
  const plain = generateApiKeyPlain();
  const hash = await sha256Hex(plain);
  const row = {
    name: params.name,
    user_id: params.user_id,
    key_prefix: plain.slice(0, 16),
    key_suffix: plain.slice(-4),
    key_hash: hash,
    quota_limit: params.quota_limit ?? null,
    expires_at: params.expires_at ?? null,
    status: 'active',
  };
  const { error } = await supabase.from('api_keys').insert(row);
  if (error) throw error;
  return { plain };
}

/** 轮换 Key：生成新明文替换摘要，旧明文立即失效 */
export async function rotateApiKey(id: string): Promise<{ plain: string }> {
  const plain = generateApiKeyPlain();
  const hash = await sha256Hex(plain);
  const { error } = await supabase
    .from('api_keys')
    .update({
      key_prefix: plain.slice(0, 16),
      key_suffix: plain.slice(-4),
      key_hash: hash,
      status: 'active',
      used_quota: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
  return { plain };
}

export async function setApiKeyStatus(id: string, status: 'active' | 'disabled'): Promise<void> {
  const { error } = await supabase.from('api_keys').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function deleteApiKey(id: string): Promise<void> {
  const { error } = await supabase.from('api_keys').delete().eq('id', id);
  if (error) throw error;
}

// ================== 渠道 ==================
export async function fetchChannels(keyword?: string): Promise<Channel[]> {
  let query = supabase.from('channels').select('*').order('priority').order('created_at');
  if (keyword) query = query.or(`name.ilike.%${keyword}%,base_url.ilike.%${keyword}%`);
  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function saveChannel(channel: Partial<Channel> & { name: string; channel_type: string; base_url: string }): Promise<void> {
  const { id, ...rest } = channel;
  const payload = {
    ...rest,
    updated_at: new Date().toISOString(),
  };
  if (id) {
    const { error } = await supabase.from('channels').update(payload).eq('id', id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('channels').insert(payload);
    if (error) throw error;
  }
}

export async function setChannelStatus(id: string, status: 'active' | 'disabled'): Promise<void> {
  const { error } = await supabase
    .from('channels')
    .update({ status, failure_count: 0, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/** 触发健康检查：记录探测时间，按近期成功率刷新健康状态 */
export async function checkChannelHealth(id: string): Promise<Channel> {
  const { data, error } = await supabase.rpc('check_channel_health', { p_channel_id: id });
  if (error) throw error;
  return data as unknown as Channel;
}

export async function deleteChannel(id: string): Promise<void> {
  const { error } = await supabase.from('channels').delete().eq('id', id);
  if (error) throw error;
}

// ================== 模型 ==================
export async function fetchModels(): Promise<ModelInfo[]> {
  const { data, error } = await supabase.from('models').select('*').order('provider').order('name');
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function saveModel(model: Partial<ModelInfo> & { name: string; provider: string }): Promise<void> {
  const { id, ...rest } = model;
  const payload = { ...rest, updated_at: new Date().toISOString() };
  if (id) {
    const { error } = await supabase.from('models').update(payload).eq('id', id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('models').insert(payload);
    if (error) throw error;
  }
}

export async function deleteModel(id: string): Promise<void> {
  const { error } = await supabase.from('models').delete().eq('id', id);
  if (error) throw error;
}

// ================== 模型别名 ==================
export async function fetchModelAliases(): Promise<ModelAlias[]> {
  const { data, error } = await supabase.from('model_aliases').select('*').order('client_model');
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function saveModelAlias(alias: { client_model: string; upstream_model: string; note?: string | null }): Promise<void> {
  const { error } = await supabase.from('model_aliases').upsert(alias, { onConflict: 'client_model' });
  if (error) throw error;
}

export async function deleteModelAlias(id: string): Promise<void> {
  const { error } = await supabase.from('model_aliases').delete().eq('id', id);
  if (error) throw error;
}

// ================== 流水 ==================
export interface UsageLogFilters {
  userId?: string;
  keyId?: string;
  model?: string;
  channelId?: string;
  status?: string;
  from?: string;
  to?: string;
}

export async function fetchUsageLogs(
  filters: UsageLogFilters,
  page = 0,
  pageSize = 20
): Promise<{ data: UsageLog[]; total: number }> {
  let query = supabase
    .from('usage_logs')
    .select('*, relay_users(username, display_name), api_keys(name, key_prefix, key_suffix)', { count: 'exact' });

  if (filters.userId) query = query.eq('relay_user_id', filters.userId);
  if (filters.keyId) query = query.eq('api_key_id', filters.keyId);
  if (filters.model) query = query.eq('model', filters.model);
  if (filters.channelId) query = query.eq('channel_id', filters.channelId);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.from) query = query.gte('created_at', filters.from);
  if (filters.to) query = query.lte('created_at', filters.to);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);
  if (error) throw error;
  return { data: Array.isArray(data) ? data : [], total: count ?? 0 };
}

// ================== 价格版本 ==================
export async function fetchPriceVersions(): Promise<PriceVersion[]> {
  const { data, error } = await supabase.from('price_versions').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function recordPriceVersion(v: {
  version: string;
  target_type: 'model' | 'group';
  target_name: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown>;
  note?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('price_versions').insert(v);
  if (error) throw error;
}

// ================== 安全基线 ==================
export async function fetchSecurityBaselines(): Promise<SecurityBaseline[]> {
  const { data, error } = await supabase.from('security_baselines').select('*').order('sort_order');
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function toggleBaseline(id: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('security_baselines')
    .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ================== 仪表盘 ==================
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const [todayAgg, onlineCh, totalCh, activeUsers] = await Promise.all([
    supabase
      .from('usage_logs')
      .select('status, total_tokens, amount')
      .gte('created_at', todayStart),
    supabase.from('channels').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('channels').select('id', { count: 'exact', head: true }),
    supabase.from('relay_users').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ]);

  if (todayAgg.error) throw todayAgg.error;
  const rows = Array.isArray(todayAgg.data) ? todayAgg.data : [];
  const total = rows.length;
  const successCount = rows.filter((r) => r.status === 'success').length;

  return {
    todayRequests: total,
    todayTokens: rows.reduce((acc, r) => acc + (r.total_tokens ?? 0), 0),
    todayAmount: rows.reduce((acc, r) => acc + (r.amount ?? 0), 0),
    successRate: total > 0 ? (successCount / total) * 100 : 100,
    onlineChannels: onlineCh.count ?? 0,
    totalChannels: totalCh.count ?? 0,
    activeUsers: activeUsers.count ?? 0,
  };
}

export async function fetchTrend(days = 7): Promise<TrendPoint[]> {
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('usage_logs')
    .select('created_at, total_tokens, amount')
    .gte('created_at', start.toISOString());
  if (error) throw error;

  const byDay = new Map<string, TrendPoint>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, { date: key, requests: 0, tokens: 0, amount: 0 });
  }
  for (const row of Array.isArray(data) ? data : []) {
    const key = (row.created_at as string).slice(0, 10);
    const point = byDay.get(key);
    if (point) {
      point.requests += 1;
      point.tokens += row.total_tokens ?? 0;
      point.amount += row.amount ?? 0;
    }
  }
  return Array.from(byDay.values());
}

// ================== 消费统计 ==================
export interface ModelStat {
  model: string;
  requests: number;
  tokens: number;
  amount: number;
}

export interface ChannelStat {
  channel_name: string;
  requests: number;
  success: number;
  amount: number;
}

export interface UserStat {
  username: string;
  display_name: string | null;
  requests: number;
  tokens: number;
  amount: number;
}

export async function fetchModelStats(days = 7): Promise<ModelStat[]> {
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  const { data, error } = await supabase.rpc('stats_by_model', { p_days: days });
  if (error) throw error;
  return (data ?? []) as ModelStat[];
}

export async function fetchChannelStats(days = 7): Promise<ChannelStat[]> {
  const { data, error } = await supabase.rpc('stats_by_channel', { p_days: days });
  if (error) throw error;
  return (data ?? []) as ChannelStat[];
}

export async function fetchUserStats(days = 7): Promise<UserStat[]> {
  const { data, error } = await supabase.rpc('stats_by_user', { p_days: days });
  if (error) throw error;
  return (data ?? []) as UserStat[];
}
