import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Coins,
  Layers,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CountUp } from '@/components/motion/CountUp';
import { fetchDashboardStats, fetchTrend, formatAmount, formatTokenCount } from '@/services/api';
import type { DashboardStats, TrendPoint } from '@/types/types';

function StatCard({
  title,
  code,
  value,
  sub,
  icon: Icon,
  trend,
  loading,
  num,
  decimals = 0,
  prefix = '',
  suffix = '',
}: {
  title: string;
  code: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  loading?: boolean;
  /** 数值型指标：启用滚动计数动画 */
  num?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
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
          <div className="flex items-baseline gap-2 flex-wrap">
            <div className="text-2xl font-semibold tabular-nums text-balance">
              {num !== undefined ? (
                <CountUp value={num} decimals={decimals} prefix={prefix} suffix={suffix} />
              ) : (
                value
              )}
            </div>
            {trend !== undefined && (
              <span className={`flex items-center text-xs ${trend >= 0 ? 'text-success' : 'text-destructive'}`}>
                {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(trend).toFixed(1)}%
              </span>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchDashboardStats(), fetchTrend(7)])
      .then(([s, t]) => {
        if (!mounted) return;
        setStats(s);
        setTrend(t);
      })
      .catch((e) => {
        if (mounted) setError(e.message ?? '数据加载失败');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const chartData = trend.map((t) => ({
    date: t.date.slice(5).replace('-', '/'),
    请求量: t.requests,
    Token: t.tokens,
    消费: Number(t.amount.toFixed(2)),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="tech-label text-[9px] text-muted-foreground/60">FIG 1.1 / OVERVIEW</div>
          <h1 className="text-xl md:text-2xl font-semibold mt-1 text-balance">运营仪表盘</h1>
          <p className="text-sm text-muted-foreground mt-1">今日核心指标与近 7 日趋势概览</p>
        </div>
      </div>

      {error && (
        <div className="border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive rounded-md">
          数据加载失败：{error}
        </div>
      )}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="今日请求量"
          code="REQ / TODAY"
          value={stats ? stats.todayRequests.toLocaleString() : '-'}
          num={stats?.todayRequests}
          sub="含流式与非流式请求"
          icon={Zap}
          loading={loading}
        />
        <StatCard
          title="今日 Token 消耗"
          code="TOKENS / TODAY"
          value={stats ? formatTokenCount(stats.todayTokens) : '-'}
          num={stats?.todayTokens}
          sub="输入 + 输出合计"
          icon={Activity}
          loading={loading}
        />
        <StatCard
          title="今日消费金额"
          code="REVENUE / TODAY"
          value={stats ? `¥${formatAmount(stats.todayAmount)}` : '-'}
          num={stats ? Number(stats.todayAmount) : undefined}
          decimals={2}
          prefix="¥"
          sub="按结算金额统计"
          icon={Coins}
          loading={loading}
        />
        <StatCard
          title="请求成功率"
          code="SUCCESS RATE"
          value={stats ? `${stats.successRate.toFixed(1)}%` : '-'}
          num={stats?.successRate}
          decimals={1}
          suffix="%"
          sub="成功请求 / 总请求"
          icon={TrendingUp}
          loading={loading}
        />
        <StatCard
          title="在线渠道"
          code="CHANNELS / ONLINE"
          value={stats ? `${stats.onlineChannels} / ${stats.totalChannels}` : '-'}
          sub={`活跃用户 ${stats?.activeUsers ?? '-'} 人`}
          icon={Layers}
          loading={loading}
        />
      </div>

      <Card className="bp-card">
        <CardHeader>
          <CardTitle className="text-base">近 7 日请求与消耗趋势</CardTitle>
          <CardDescription className="text-pretty">按日汇总的请求量、Token 消耗与消费金额折线图</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                      fontSize: 12,
                      color: 'hsl(var(--popover-foreground))',
                    }}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="请求量" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} animationDuration={1100} animationEasing="ease-out" />
                  <Line yAxisId="left" type="monotone" dataKey="Token" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} animationDuration={1100} animationEasing="ease-out" />
                  <Line yAxisId="right" type="monotone" dataKey="消费" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} strokeDasharray="4 4" animationDuration={1100} animationEasing="ease-out" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-chart-1 inline-block" />请求量</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-chart-2 inline-block" />Token 消耗</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-chart-4 inline-block" />消费金额（右轴）</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}