import { useEffect, useMemo, useState } from 'react';
import {
  Ban,
  Coins,
  FileClock,
  History,
  Loader2,
  ReceiptText,
  Search,
  Undo2,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  fetchChannels,
  fetchGroups,
  fetchPriceVersions,
  fetchRelayUsers,
  fetchUsageLogs,
} from '@/services/api';
import type { ApiKey, Channel, PriceVersion, RelayUser, UsageLog } from '@/types/types';

const PAGE_SIZE = 15;

// ============ 账务示意卡片 ============
function BillingFlow() {
  const steps = [
    {
      icon: Wallet,
      title: '① 额度预扣',
      desc: '认 Key 通过后，按请求模型的预估 Token 量预扣额度（约 1.2–1.7 倍）；余额不足直接返回 402。',
    },
    {
      icon: ReceiptText,
      title: '② 按量结算',
      desc: '上游返回 usage 后，按 (输入×单价 + 输出×单价) × 模型倍率 × 分组倍率 × 渠道倍率 精确结算，多退少补。',
    },
    {
      icon: Undo2,
      title: '③ 失败退款',
      desc: '上游非 200 或传输中断时，全额退还预扣额度并记录退款流水，用户额度不受损失。',
    },
  ];
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
      {steps.map((s) => {
        const Icon = s.icon;
        return (
          <Card key={s.title} className="bp-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Icon className="w-4 h-4 text-primary" />
                {s.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed text-pretty">{s.desc}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============ 消费流水 ============
function UsageLogsTab() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<RelayUser[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);

  const [filterUser, setFilterUser] = useState('all');
  const [filterModel, setFilterModel] = useState('all');
  const [filterChannel, setFilterChannel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = async (p = 0) => {
    setLoading(true);
    try {
      const res = await fetchUsageLogs(
        {
          userId: filterUser !== 'all' ? filterUser : undefined,
          model: filterModel !== 'all' ? filterModel : undefined,
          channelId: filterChannel !== 'all' ? filterChannel : undefined,
          status: filterStatus !== 'all' ? filterStatus : undefined,
          from: dateFrom ? new Date(`${dateFrom}T00:00:00`).toISOString() : undefined,
          to: dateTo ? new Date(`${dateTo}T23:59:59`).toISOString() : undefined,
        },
        p,
        PAGE_SIZE
      );
      setLogs(res.data);
      setTotal(res.total);
      setPage(p);
    } catch (e) {
      toast.error('加载流水失败', { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([fetchRelayUsers(), fetchChannels()])
      .then(([u, c]) => {
        setUsers(u);
        setChannels(c);
      })
      .catch(() => undefined);
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const models = useMemo(() => {
    const set = new Set<string>();
    for (const l of logs) set.add(l.model);
    return Array.from(set).sort();
  }, [logs]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const keyLabel = (l: UsageLog): string => {
    const k = l.api_keys;
    if (!k) return '-';
    return `${k.name}（${k.key_prefix}****${k.key_suffix}）`;
  };

  return (
    <div className="space-y-4">
      <div className="bp-card p-3">
        <div className="flex flex-row items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-0 md:min-w-44">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <Input
              placeholder="按用户筛选…"
              className="pl-9"
              value={filterUser === 'all' ? '' : users.find((u) => u.id === filterUser)?.username ?? ''}
              onChange={(e) => {
                const q = e.target.value.trim();
                if (!q) setFilterUser('all');
                else {
                  const hit = users.find((u) => u.username.includes(q) || (u.display_name ?? '').includes(q));
                  setFilterUser(hit ? hit.id : `none:${q}`);
                }
              }}
            />
          </div>
          <Select value={filterChannel} onValueChange={setFilterChannel}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="渠道" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部渠道</SelectItem>
              {channels.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterModel} onValueChange={setFilterModel}>
            <SelectTrigger className="w-full md:w-44">
              <SelectValue placeholder="模型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部模型</SelectItem>
              {models.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-32">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="success">成功</SelectItem>
              <SelectItem value="refunded">已退款</SelectItem>
              <SelectItem value="failed">失败</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full md:w-36"
            aria-label="开始日期"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full md:w-36"
            aria-label="结束日期"
          />
          <Button size="sm" onClick={() => load(0)} className="gap-1.5 shrink-0">
            <Search className="w-3.5 h-3.5" />
            筛选
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={() => {
              setFilterUser('all');
              setFilterChannel('all');
              setFilterModel('all');
              setFilterStatus('all');
              setDateFrom('');
              setDateTo('');
              load(0);
            }}
          >
            重置
          </Button>
        </div>
      </div>

      <div className="bp-card">
        <div className="w-full max-w-full overflow-x-auto bg-card">
          <Table className="min-w-[1200px] [&>div]:max-w-full">
            <TableHeader>
              <TableRow className="whitespace-nowrap">
                <TableHead>时间</TableHead>
                <TableHead>用户</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>模型</TableHead>
                <TableHead>渠道</TableHead>
                <TableHead className="text-right">输入 / 输出 Token</TableHead>
                <TableHead className="text-right">扣费</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">耗时</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    <FileClock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    暂无匹配的消费流水
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((l) => (
                  <TableRow key={l.id} className="whitespace-nowrap">
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(l.created_at).toLocaleString('zh-CN', { hour12: false })}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{l.relay_users?.display_name || l.relay_users?.username || '-'}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{l.relay_users?.username ?? ''}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-40">
                      <span className="block truncate" title={keyLabel(l)}>{keyLabel(l)}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{l.model}</TableCell>
                    <TableCell className="text-xs">{l.channel_name}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">
                      {l.input_tokens.toLocaleString()} / {l.output_tokens.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {l.status === 'success' ? (
                        <span>¥{l.amount.toFixed(4)}</span>
                      ) : (
                        <span className="text-muted-foreground">退 ¥{l.refund_amount.toFixed(4)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {l.status === 'success' ? (
                        <Badge className="bg-success/15 text-success border-success/40">
                          {l.http_status ?? 200}
                        </Badge>
                      ) : l.status === 'refunded' ? (
                        <Badge className="bg-warning/15 text-warning border-warning/40">
                          退款 {l.http_status ?? '-'}
                        </Badge>
                      ) : (
                        <Badge className="bg-destructive/15 text-destructive border-destructive/40">
                          <Ban className="w-3 h-3 mr-1" />
                          {l.error_code ?? '失败'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                      {l.latency_ms !== null ? `${l.latency_ms}ms` : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between border-t border-border p-3 flex-wrap gap-2">
          <div className="text-xs text-muted-foreground">
            共 {total} 条记录 · 第 {page + 1} / {totalPages} 页
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0 || loading} onClick={() => load(page - 1)}>
              上一页
            </Button>
            <Button variant="outline" size="sm" disabled={page + 1 >= totalPages || loading} onClick={() => load(page + 1)}>
              下一页
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ 价格版本 ============
function PriceVersionsTab() {
  const [versions, setVersions] = useState<PriceVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPriceVersions()
      .then(setVersions)
      .catch((e) => toast.error('加载价格版本失败', { description: e.message }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bp-card">
      <div className="w-full max-w-full overflow-x-auto bg-card">
        <Table className="min-w-[900px] [&>div]:max-w-full">
          <TableHeader>
            <TableRow className="whitespace-nowrap">
              <TableHead>版本</TableHead>
              <TableHead>对象</TableHead>
              <TableHead>调整前</TableHead>
              <TableHead>调整后</TableHead>
              <TableHead>说明</TableHead>
              <TableHead>时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : versions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  暂无价格版本记录
                </TableCell>
              </TableRow>
            ) : (
              versions.map((v) => (
                <TableRow key={v.id} className="whitespace-nowrap">
                  <TableCell>
                    <Badge variant="outline" className="border-primary/40 text-primary font-mono">{v.version}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{v.target_type === 'model' ? '模型' : '分组'}</Badge>
                    <span className="ml-2 font-mono text-sm">{v.target_name}</span>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground max-w-52">
                    {v.old_value ? JSON.stringify(v.old_value) : '—（新增）'}
                  </TableCell>
                  <TableCell className="font-mono text-xs max-w-52">{JSON.stringify(v.new_value)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-52">
                    <span className="block truncate" title={v.note ?? ''}>{v.note ?? '-'}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(v.created_at).toLocaleString('zh-CN', { hour12: false })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ============ 余额总览 ============
function BalancesTab() {
  const [users, setUsers] = useState<RelayUser[]>([]);
  const [groups, setGroups] = useState<{ id: string; display_name: string | null; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([fetchRelayUsers(), fetchGroups()])
      .then(([u, g]) => {
        setUsers(u);
        setGroups(g);
      })
      .catch((e) => toast.error('加载余额失败', { description: e.message }))
      .finally(() => setLoading(false));
  }, []);

  const groupMap = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
  const filtered = users.filter(
    (u) => !search || u.username.includes(search) || (u.display_name ?? '').includes(search)
  );
  const totalBalance = filtered.reduce((a, u) => a + u.balance, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card className="bp-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">总余额（筛选后）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">¥{totalBalance.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="bp-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">活跃用户</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {filtered.filter((u) => u.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card className="bp-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">低余额用户（低于 ¥50）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums text-warning">
              {filtered.filter((u) => u.balance < 50).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bp-card">
        <div className="flex flex-row items-center gap-3 border-b border-border p-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索用户…"
              className="pl-9"
            />
          </div>
        </div>
        <div className="w-full max-w-full overflow-x-auto bg-card">
          <Table className="min-w-[760px] [&>div]:max-w-full">
            <TableHeader>
              <TableRow className="whitespace-nowrap">
                <TableHead>用户</TableHead>
                <TableHead>分组</TableHead>
                <TableHead className="text-right">余额</TableHead>
                <TableHead className="text-right">累计消费</TableHead>
                <TableHead className="text-right">额度上限</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                filtered.map((u) => {
                  const g = groupMap.get(u.group_id);
                  return (
                    <TableRow key={u.id} className="whitespace-nowrap">
                      <TableCell>
                        <div className="font-medium">{u.display_name || u.username}</div>
                        <div className="text-xs text-muted-foreground font-mono">{u.username}</div>
                      </TableCell>
                      <TableCell>{g?.display_name ?? g?.name ?? '-'}</TableCell>
                      <TableCell className={`text-right tabular-nums ${u.balance < 50 ? 'text-warning' : ''}`}>
                        ¥{u.balance.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        ¥{u.total_consumed.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {u.quota_limit === null ? '不限' : `¥${u.quota_limit.toFixed(2)}`}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            u.status === 'active'
                              ? 'bg-success/15 text-success border-success/40'
                              : 'bg-destructive/15 text-destructive border-destructive/40'
                          }
                        >
                          {u.status === 'active' ? '正常' : '禁用'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// ============ 页面主体 ============
export default function Billing() {
  return (
    <div className="space-y-6">
      <div>
        <div className="tech-label text-[9px] text-muted-foreground/60">FIG 6.1 / LEDGER</div>
        <h1 className="text-xl md:text-2xl font-semibold mt-1 text-balance">额度账务</h1>
        <p className="text-sm text-muted-foreground mt-1">余额管理、预扣/结算/退款账务逻辑与消费流水审计</p>
      </div>

      <BillingFlow />

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs" className="gap-1.5">
            <ReceiptText className="w-4 h-4" />
            消费流水
          </TabsTrigger>
          <TabsTrigger value="balances" className="gap-1.5">
            <Coins className="w-4 h-4" />
            余额总览
          </TabsTrigger>
          <TabsTrigger value="prices" className="gap-1.5">
            <History className="w-4 h-4" />
            价格版本
          </TabsTrigger>
        </TabsList>
        <TabsContent value="logs">
          <UsageLogsTab />
        </TabsContent>
        <TabsContent value="balances">
          <BalancesTab />
        </TabsContent>
        <TabsContent value="prices">
          <PriceVersionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
