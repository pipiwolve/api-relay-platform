// ============ 客户端（接入方）自助门户类型 ============

/** 个人账户汇总（门户首页统计卡） */
export interface PortalSummary {
  my_balance: number;
  today_amount: number;
  today_tokens: number;
  week_amount: number;
  week_tokens: number;
  key_count: number;
}

/** 个人近 N 日按天趋势点 */
export interface PortalTrendPoint {
  day: string;
  tokens: number;
  requests: number;
  amount: number;
}

/** 本人所属分组（计费倍率与模型白名单） */
export interface PortalGroup {
  id: string;
  name: string;
  display_name: string | null;
  rate_multiplier: number;
  allowed_models: string[];
  description: string | null;
}

/** 当前分组可调用的模型 */
export interface PortalAvailableModel {
  name: string;
  display_name: string | null;
  provider: string;
  input_price: number;
  output_price: number;
  model_rate: number;
}

/** 客户端消费明细筛选条件 */
export interface MyLogFilters {
  model?: string;
  channel_name?: string;
  from?: string;
  to?: string;
}
