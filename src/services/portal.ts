import { supabase } from '@/db/supabase';
import type { ApiKey, RelayUser } from '@/types/types';
import type { MyLogFilters, PortalAvailableModel, PortalGroup, PortalSummary, PortalTrendPoint } from '@/types/portal';

// ============ 客户端（接入方）自助门户 API ============
// 数据隔离：relay_users / api_keys / usage_logs 均由 RLS 按 auth_uid 自动过滤，
// 任何查询只可能返回当前登录用户自己的数据。

/** 获取当前登录客户端用户自己的 relay_users 行 */
export async function fetchMyRelayProfile(): Promise<RelayUser | null> {
  const { data, error } = await supabase.from('relay_users').select('*').maybeSingle();
  if (error) throw new Error(`获取个人档案失败: ${error.message}`);
  return data ?? null;
}

/** 客户端注册建档：signUp 成功后调用，绑定默认分组并发放初始额度 */
export async function portalRegister(username: string, displayName?: string): Promise<RelayUser> {
  const { data, error } = await supabase.rpc('portal_register', {
    p_username: username,
    p_display_name: displayName ?? '',
  });
  if (error) throw new Error(error.message);
  return data as RelayUser;
}

/** 修改本人昵称 */
export async function portalUpdateProfile(displayName: string): Promise<void> {
  const { error } = await supabase.rpc('portal_update_profile', { p_display_name: displayName });
  if (error) throw new Error(`昵称保存失败: ${error.message}`);
}

/** 修改本人登录密码（Supabase Auth） */
export async function changeMyPassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(`密码修改失败: ${error.message}`);
}

/** 个人账户汇总（余额 / 今日与近7日消耗 / Key 数量） */
export async function fetchMySummary(): Promise<PortalSummary> {
  const { data, error } = await supabase.rpc('portal_my_summary');
  if (error) throw new Error(`获取账户汇总失败: ${error.message}`);
  const rows = Array.isArray(data) ? data : [data];
  return (rows[0] ?? {
    my_balance: 0,
    today_amount: 0,
    today_tokens: 0,
    week_amount: 0,
    week_tokens: 0,
    key_count: 0,
  }) as PortalSummary;
}

/** 个人近 N 日按天趋势 */
export async function fetchMyTrend(days = 7): Promise<PortalTrendPoint[]> {
  const { data, error } = await supabase.rpc('portal_my_trend', { p_days: days });
  if (error) throw new Error(`获取消费趋势失败: ${error.message}`);
  return Array.isArray(data) ? data : [];
}

/** 本人所属分组（倍率与模型白名单） */
export async function fetchMyGroup(): Promise<PortalGroup | null> {
  const { data, error } = await supabase.rpc('portal_my_group');
  if (error) throw new Error(`获取分组信息失败: ${error.message}`);
  const rows = Array.isArray(data) ? data : [data];
  return (rows[0] ?? null) as PortalGroup | null;
}

/** 当前分组可用的模型列表（白名单过滤后） */
export async function fetchAvailableModels(): Promise<PortalAvailableModel[]> {
  const { data, error } = await supabase.rpc('portal_available_models');
  if (error) throw new Error(`获取可用模型失败: ${error.message}`);
  return Array.isArray(data) ? data : [];
}

/** 当前用户名下的 API Key 列表（仅本人可见） */
export async function fetchMyApiKeys(relayUserId: string): Promise<ApiKey[]> {
  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('user_id', relayUserId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`获取 Key 列表失败: ${error.message}`);
  return Array.isArray(data) ? data : [];
}

/** 客户端消费流水行（简化字段，无需关联查询） */
export interface RelayUserLogRow {
  id: string;
  model: string;
  upstream_model: string | null;
  channel_name: string;
  input_tokens: number;
  output_tokens: number;
  amount: number;
  refund_amount: number;
  status: string;
  http_status: number | null;
  latency_ms: number | null;
  created_at: string;
}

/** 当前用户的消费流水（分页，RLS 自动限定本人数据） */
export async function fetchMyUsageLogs(
  relayUserId: string,
  filters: MyLogFilters,
  page = 0,
  pageSize = 15
): Promise<{ data: RelayUserLogRow[]; total: number }> {
  let query = supabase
    .from('usage_logs')
    .select('*', { count: 'exact' })
    .eq('relay_user_id', relayUserId);
  if (filters.model) query = query.eq('model', filters.model);
  if (filters.channel_name) query = query.eq('channel_name', filters.channel_name);
  if (filters.from) query = query.gte('created_at', filters.from);
  if (filters.to) query = query.lte('created_at', filters.to);
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);
  if (error) throw new Error(`获取消费明细失败: ${error.message}`);
  return { data: (Array.isArray(data) ? data : []) as RelayUserLogRow[], total: count ?? 0 };
}
