import { useEffect, useState } from 'react';
import { Activity, BarChart3, Loader2, PieChart as PieIcon, Trophy, Users } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchChannelStats, fetchModelStats, fetchUserStats } from '@/services/api';

const CHART_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const tooltipStyle = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 'var(--radius)',
  fontSize: 12,
  color: 'hsl(var(--popover-foreground))',
};

export default function UsageStats() {
  const [days, setDays] = useState('7');
  const [modelStats, setModelStats] = useState<{ model: string; requests: number; tokens: number; amount: number }[]>([]);
  const [channelStats, setChannelStats] = useState<{ channel_name: string; requests: number; success: number; amount: number }[]>([]);
  const [userStats, setUserStats] = useState<{ username: string; display_name: string | null; requests: number; tokens: number; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const d = Number(days);
    setLoading(true);
    Promise.all([fetchModelStats(d), fetchChannelStats(d), fetchUserStats(d)])
      .then(([m, c, u]) => {
        setModelStats(m);
        setChannelStats(c);
        setUserStats(u);
      })
      .catch((e) => console.error('统计加载失败', e))
      .finally(() => setLoading(false));
  }, [days]);

  const totalAmount = modelStats.reduce((a, m) => a + Number(m.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="tech-label text-[9px] text-muted-foreground/60">FIG 7.1 / ANALYTICS</div>
          <h1 className="text-xl md:text-2xl font-semibold mt-1 text-balance">消费统计</h1>
          <p className="text-sm text-muted-foreground mt-1">按模型、渠道、用户维度分析 Token 消耗与费用分布</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {loading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">今日</SelectItem>
              <SelectItem value="7">近 7 天</SelectItem>
              <SelectItem value="30">近 30 天</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="model" className="space-y-4">
        <TabsList>
          <TabsTrigger value="model" className="gap-1.5">
            <PieIcon className="w-4 h-4" />
            按模型
          </TabsTrigger>
          <TabsTrigger value="channel" className="gap-1.5">
            <Activity className="w-4 h-4" />
            按渠道
          </TabsTrigger>
          <TabsTrigger value="user" className="gap-1.5">
            <Users className="w-4 h-4" />
            按用户
          </TabsTrigger>
        </TabsList>

        {/* 模型维度 */}
        <TabsContent value="model" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 @lg:grid-cols-3">
            <Card className="bp-card">
              <CardHeader>
                <CardTitle className="text-base">费用占比</CardTitle>
                <CardDescription>各模型消费金额占比</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <div className="w-full min-w-0 overflow-hidden">
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={modelStats}
                          dataKey="amount"
                          nameKey="model"
                          cx="50%"
                          cy="50%"
                          outerRadius={85}
                          innerRadius={45}
                          paddingAngle={2}
                        >
                          {modelStats.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="hsl(var(--card))" strokeWidth={1} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `¥${Number(v).toFixed(4)}`} />
                        <Legend wrapperStyle={{ paddingTop: 8, fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bp-card @lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Token 消耗</CardTitle>
                <CardDescription>各模型输入/输出合计 Token 数</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <div className="w-full min-w-0 overflow-hidden">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={modelStats} margin={{ top: 8, right: 12, bottom: 24, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                        <XAxis dataKey="model" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} interval={0} angle={-30} textAnchor="end" height={48} />
                        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [v.toLocaleString(), n === 'tokens' ? 'Token' : n]} />
                        <Bar dataKey="tokens" name="Token" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 渠道维度 */}
        <TabsContent value="channel" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 @lg:grid-cols-2">
            <Card className="bp-card">
              <CardHeader>
                <CardTitle className="text-base">各渠道请求量</CardTitle>
                <CardDescription>请求量分布与成功数对比</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <div className="w-full min-w-0 overflow-hidden">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={channelStats} margin={{ top: 8, right: 12, bottom: 24, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                        <XAxis dataKey="channel_name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} interval={0} angle={-20} textAnchor="end" height={48} />
                        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ paddingTop: 4, fontSize: 11 }} />
                        <Bar dataKey="success" name="成功" stackId="a" fill="hsl(var(--chart-1))" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="requests" name="总请求" fill="hsl(var(--chart-4))" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bp-card">
              <CardHeader>
                <CardTitle className="text-base">各渠道消费金额</CardTitle>
                <CardDescription>费用分布（¥）</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <div className="w-full min-w-0 overflow-hidden">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={channelStats} margin={{ top: 8, right: 12, bottom: 24, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                        <XAxis dataKey="channel_name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} interval={0} angle={-20} textAnchor="end" height={48} />
                        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `¥${Number(v).toFixed(4)}`} />
                        <Bar dataKey="amount" name="消费金额" fill="hsl(var(--chart-3))" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="bp-card">
            <CardHeader>
              <CardTitle className="text-base">渠道成功率</CardTitle>
              <CardDescription>成功请求 / 总请求（近 {days} 天）</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-40 w-full" />
              ) : channelStats.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">暂无数据</p>
              ) : (
                <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                  {channelStats.map((c) => {
                    const rate = c.requests > 0 ? (Number(c.success) / Number(c.requests)) * 100 : 0;
                    return (
                      <div key={c.channel_name} className="border border-border bg-secondary/30 p-3 rounded-md">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-sm font-medium truncate">{c.channel_name}</span>
                          <span className="tabular-nums text-xs text-muted-foreground">{rate.toFixed(1)}%</span>
                        </div>
                        <div className="h-1 bg-muted overflow-hidden rounded-full">
                          <div
                            className={`h-full ${rate >= 95 ? 'bg-success' : rate >= 85 ? 'bg-warning' : 'bg-destructive'}`}
                            style={{ width: `${Math.min(rate, 100)}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1.5 tabular-nums">
                          {Number(c.success).toLocaleString()} / {Number(c.requests).toLocaleString()} 次成功
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 用户维度 */}
        <TabsContent value="user" className="space-y-4">
          <Card className="bp-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-warning" />
                用户消费排行
              </CardTitle>
              <CardDescription>按消费金额排序的 Top 用户（近 {days} 天，总计 ¥{totalAmount.toFixed(4)}）</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="w-full min-w-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={userStats} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <YAxis
                        type="category"
                        dataKey="username"
                        tick={{ fontSize: 11, fontFamily: 'monospace' }}
                        stroke="hsl(var(--muted-foreground))"
                        tickLine={false}
                        axisLine={false}
                        width={100}
                      />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `¥${Number(v).toFixed(4)}`} />
                      <Bar dataKey="amount" name="消费金额" fill="hsl(var(--chart-1))" radius={[0, 2, 2, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bp-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                用户请求量与 Token 消耗
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="w-full min-w-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={userStats} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                      <XAxis dataKey="username" tick={{ fontSize: 11, fontFamily: 'monospace' }} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ paddingTop: 4, fontSize: 11 }} />
                      <Bar yAxisId="left" dataKey="requests" name="请求量" fill="hsl(var(--chart-1))" radius={[2, 2, 0, 0]} />
                      <Bar yAxisId="right" dataKey="tokens" name="Token" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
