import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, ChevronLeft, ChevronRight, Loader2, ReceiptText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SpringIn } from '@/components/motion/SpringIn';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMyUsageLogs } from '@/services/portal';
import type { RelayUserLogRow } from '@/services/portal';

const PAGE_SIZE = 15;

type RangeKey = 'today' | '7d' | '30d';

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: 'today', label: '今日' },
  { key: '7d', label: '近 7 天' },
  { key: '30d', label: '近 30 天' },
];

function rangeToFromTo(range: RangeKey): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();
  const start = new Date(now);
  if (range === 'today') {
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(start.getDate() - (range === '7d' ? 7 : 30));
  }
  return { from: start.toISOString(), to };
}

/** 消费明细：当前用户本人的用量流水，支持时间区间 / 模型 / 渠道筛选 */
export default function MyLogs() {
  const { relayProfile } = useAuth();
  const relayUserId = relayProfile?.id;

  const [range, setRange] = useState<RangeKey>('7d');
  const [model, setModel] = useState<string>('all');
  const [channel, setChannel] = useState<string>('all');
  const [page, setPage] = useState(0);

  const [rows, setRows] = useState<RelayUserLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** 从返回数据聚合可选的模型/渠道（累计合并） */
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [channelOptions, setChannelOptions] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!relayUserId) return;
    setLoading(true);
    setError(null);
    const { from, to } = rangeToFromTo(range);
    try {
      const { data, total: cnt } = await fetchMyUsageLogs(
        relayUserId,
        {
          model: model === 'all' ? undefined : model,
          channel_name: channel === 'all' ? undefined : channel,
          from,
          to,
        },
        page,
        PAGE_SIZE
      );
      setRows(data);
      setTotal(cnt);
      setModelOptions((prev) => {
        const merged = new Set([...prev, ...data.map((r) => r.model)]);
        return Array.from(merged).sort();
      });
      setChannelOptions((prev) => {
        const merged = new Set([...prev, ...data.map((r) => r.channel_name)]);
        return Array.from(merged).sort();
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [relayUserId, range, model, channel, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageAmount = useMemo(
    () => rows.reduce((a, r) => a + Number(r.amount ?? 0) - Number(r.refund_amount ?? 0), 0),
    [rows]
  );

  const changeRange = (key: RangeKey) => {
    setRange(key);
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="tech-label text-[9px] text-muted-foreground/60">FIG 4.1 / MY USAGE LOGS</div>
        <h1 className="text-xl md:text-2xl font-semibold mt-1 text-balance">消费明细</h1>
        <p className="text-sm text-muted-foreground mt-1">本人 API 调用流水，支持按时间区间、模型、渠道筛选</p>
      </div>

      {/* 筛选区 */}
      <Card className="bp-card">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            {/* 时间区间切换 */}
            <div className="flex items-center rounded-md border border-border bg-secondary/40 p-0.5 shrink-0">
              {RANGE_OPTIONS.map((opt) => (
                <Button
                  key={opt.key}
                  size="sm"
                  variant="ghost"
                  onClick={() => changeRange(opt.key)}
                  className={`h-8 px-3 text-xs rounded-[5px] ${
                    range === opt.key
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </Button>
              ))}
            </div>

            {/* 模型筛选 */}
            <Select
              value={model}
              onValueChange={(v) => {
                setModel(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[200px] shrink-0" aria-label="按模型筛选">
                <SelectValue placeholder="全部模型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部模型</SelectItem>
                {modelOptions.map((m) => (
                  <SelectItem key={m} value={m} className="font-mono text-xs">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 渠道筛选 */}
            <Select
              value={channel}
              onValueChange={(v) => {
                setChannel(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[180px] shrink-0" aria-label="按渠道筛选">
                <SelectValue placeholder="全部渠道" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部渠道</SelectItem>
                {channelOptions.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground shrink-0">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> : <CalendarClock className="w-3.5 h-3.5" />}
              <span className="tabular-nums">
                共 {total.toLocaleString()} 条 · 本页 ¥{pageAmount.toFixed(4)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 流水表 */}
      <SpringIn>
        <Card className="bp-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ReceiptText className="w-4 h-4 text-primary" />
              用量流水
            </CardTitle>
            <CardDescription>币种：人民币（CNY / ¥），金额精度 6 位小数（展示 4 位）</CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive rounded-md">
                明细加载失败：{error}
              </div>
            ) : loading ? (
              <div className="space-y-2">
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <ReceiptText className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">当前筛选条件下暂无调用流水</p>
                <p className="text-xs text-muted-foreground/70">签发 API Key 并发起调用后，流水将在此展示</p>
              </div>
            ) : (
              <>
                <div className="w-full max-w-full overflow-x-auto bg-card">
                  <Table className="[&>div]:max-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">时间</TableHead>
                        <TableHead className="whitespace-nowrap">模型</TableHead>
                        <TableHead className="whitespace-nowrap">渠道</TableHead>
                        <TableHead className="whitespace-nowrap text-right">输入 Token</TableHead>
                        <TableHead className="whitespace-nowrap text-right">输出 Token</TableHead>
                        <TableHead className="whitespace-nowrap text-right">费用</TableHead>
                        <TableHead className="whitespace-nowrap text-right">币种</TableHead>
                        <TableHead className="whitespace-nowrap">状态</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleString('zh-CN', { hour12: false })}
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-mono text-xs">{r.model}</TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{r.channel_name}</TableCell>
                          <TableCell className="whitespace-nowrap text-right tabular-nums text-muted-foreground">
                            {r.input_tokens.toLocaleString()}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right tabular-nums text-muted-foreground">
                            {r.output_tokens.toLocaleString()}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right tabular-nums">
                            ¥
                            {(Number(r.amount ?? 0) - Number(r.refund_amount ?? 0)).toFixed(4)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">CNY</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {r.status === 'success' ? (
                              <Badge className="border-success/40 bg-success/10 text-success">成功</Badge>
                            ) : r.status === 'refunded' ? (
                              <Badge className="border-warning/40 bg-warning/10 text-warning">已退款</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-muted-foreground">
                                {r.status === 'failed' ? '失败' : r.status}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* 分页 */}
                <div className="flex items-center justify-between gap-2 mt-4 flex-wrap">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    第 {page + 1} / {totalPages} 页
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0 || loading}
                      className="gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1 || loading}
                      className="gap-1"
                    >
                      下一页
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </SpringIn>
    </div>
  );
}
