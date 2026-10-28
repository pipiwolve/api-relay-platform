import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BookOpenText,
  Coins,
  KeyRound,
  Layers,
  Loader2,
  Sparkles,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CountUp } from '@/components/motion/CountUp';
import {
  fetchAvailableModels,
  fetchMyGroup,
  fetchMySummary,
  fetchMyTrend,
} from '@/services/portal';
import type { PortalAvailableModel, PortalGroup, PortalSummary, PortalTrendPoint } from '@/types/portal';

const tooltipStyle = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 'var(--radius)',
  fontSize: 12,
  color: 'hsl(var(--popover-foreground))',
};

function StatCard({
  title,
  code,
  icon: Icon,
  num,
  decimals = 0,
  prefix = '',
  sub,
  loading,
}: {
  title: string;
  code: string;
  icon: React.ComponentType<{ className?: string }>;
  num?: number;
  decimals?: number;
  prefix?: string;
  sub: string;
  loading: boolean;
}) {
  return (
    <Card className="bp-card bp-hover-lift">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <div className="tech-label text-[9px] text-muted-foreground/50 mt-0.5">{code}</div>
          </div>
          <div className="flex items-center justify-center w-9 h-9 border border-border bg-secondary/50 shrink-0 rounded-md">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-9 w-28" />
        ) : (
          <div className="text-2xl font-semibold tabular-nums text-balance">
            <CountUp value={num ?? 0} decimals={decimals} prefix={prefix} />
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>
      </CardContent>
    </Card>
  );
}

/** 客户端门户首页：个人余额、今日/近7日消耗、分组与可用模型、趋势图 */
export default function PortalDashboard() {
  const [summary, setSummary] = useState<PortalSummary | null>(null);
  const [trend, setTrend] = useState<PortalTrendPoint[]>([]);
  const [group, setGroup] = useState<PortalGroup | null>(null);
  const [models, setModels] = useState<PortalAvailableModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchMySummary(), fetchMyTrend(7), fetchMyGroup(), fetchAvailableModels()])
      .then(([s, t, g, m]) => {
        if (!mounted) return;
        setSummary(s);
        setTrend(t);
        setGroup(g);
        setModels(m);
      })
      .catch((e) => {
        if (mounted) setError((e as Error).message ?? '数据加载失败');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const chartData = trend.map((t) => ({
    date: t.day.slice(5).replace('-', '/'),
    Token: t.tokens,
    请求量: t.requests,
  }));

  const weekRequests = trend.reduce((a, t) => a + t.requests, 0);

  return (
    <div className="space-y-6">
      {/* 标题区 */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="tech-label text-[9px] text-muted-foreground/60">FIG 3.1 / MY OVERVIEW</div>
          <h1 className="text-xl md:text-2xl font-semibold mt-1 text-balance">我的仪表盘</h1>
          <p className="text-sm text-muted-foreground mt-1">账户余额、用量统计与可用模型概览</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {loading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
          <Button asChild size="sm" className="gap-1.5">
            <Link to="/portal/keys">
              <KeyRound className="w-3.5 h-3.5" />
              签发 API Key
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive rounded-md">
          数据加载失败：{error}
        </div>
      )}

      {/* 统计卡 */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="可用余额"
          code="BALANCE"
          icon={Wallet}
          num={summary ? Number(summary.my_balance) : 0}
          decimals={2}
          prefix="¥"
          sub="余额不足时调用将返回 402"
          loading={loading}
        />
        <StatCard
          title="今日消费"
          code="SPENT / TODAY"
          icon={Coins}
          num={summary ? Number(summary.today_amount) : 0}
          decimals={4}
          prefix="¥"
          sub="按成功请求结算金额统计"
          loading={loading}
        />
        <StatCard
          title="今日 Token 消耗"
          code="TOKENS / TODAY"
          icon={Activity}
          num={summary ? Number(summary.today_tokens) : 0}
          sub="输入 + 输出合计 Token"
          loading={loading}
        />
        <StatCard
          title="近 7 日消费"
          code="SPENT / 7D"
          icon={Sparkles}
          num={summary ? Number(summary.week_amount) : 0}
          decimals={4}
          prefix="¥"
          sub={`近 7 日累计 ${weekRequests.toLocaleString()} 次请求`}
          loading={loading}
        />
      </div>

      {/* 分组与可用模型 */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card className="bp-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              我的分组
            </CardTitle>
            <CardDescription>分组决定计费倍率与可用模型范围</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <Skeleton className="h-16 w-full" />
            ) : group ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{group.display_name || group.name}</span>
                  <Badge className="border-primary/40 bg-primary/10 text-primary font-mono">×{group.rate_multiplier}</Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed text-pretty">
                  最终计费 = 模型单价 × 模型倍率 × 分组倍率 × 渠道倍率；分组倍率由平台运营配置。
                </p>
                <p className="text-xs text-muted-foreground text-pretty">
                  {group.description ?? '当前分组未设置说明。'}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">未查询到分组信息</p>
            )}
          </CardContent>
        </Card>

        <Card className="bp-card md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  可用模型
                </CardTitle>
                <CardDescription>当前分组允许调用的模型（共 {models.length} 个）</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link to="/portal/docs">
                  <BookOpenText className="w-3.5 h-3.5" />
                  查看调用文档
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-20 w-full" />
            ) : models.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">当前分组暂无可用模型，请联系平台管理员。</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {models.map((m) => (
                  <Badge key={m.name} variant="secondary" className="font-mono text-[11px] gap-1.5">
                    {m.name}
                    <span className="text-muted-foreground">×{m.model_rate}</span>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 趋势图 */}
      <Card className="bp-card">
        <CardHeader>
          <CardTitle className="text-base">近 7 日用量趋势</CardTitle>
          <CardDescription className="text-pretty">每日 Token 消耗与请求次数（按北京时间分日）</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="portalTokenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="Token"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    fill="url(#portalTokenGrad)"
                    animationDuration={1100}
                    animationEasing="ease-out"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="请求量"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="4 4"
                    animationDuration={1100}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-chart-1 inline-block" />Token 消耗（左轴）</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-chart-2 inline-block" />请求次数（右轴）</span>
            <Link to="/portal/logs" className="ml-auto inline-flex items-center gap-1 text-primary hover:underline">
              查看完整消费明细
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
