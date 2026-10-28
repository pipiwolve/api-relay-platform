import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Activity,
  HeartPulse,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { checkChannelHealth, deleteChannel, fetchChannels, fetchModels, saveChannel, setChannelStatus } from '@/services/api';
import type { Channel, ChannelType, ModelInfo } from '@/types/types';

const CHANNEL_TYPE_LABEL: Record<ChannelType, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Gemini',
  deepseek: 'DeepSeek',
  custom: '自定义兼容',
};

const CHANNEL_TYPE_ENDPOINT: Record<ChannelType, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  deepseek: 'https://api.deepseek.com/v1',
  custom: 'https://your-compatible-endpoint/v1',
};

type HealthBadgeProps = { status: Channel['health_status'] };

function HealthBadge({ status }: HealthBadgeProps) {
  const map = {
    healthy: { label: '健康', cls: 'bg-success/15 text-success border-success/40' },
    degraded: { label: '降级', cls: 'bg-warning/15 text-warning border-warning/40' },
    down: { label: '不可用', cls: 'bg-destructive/15 text-destructive border-destructive/40' },
    unknown: { label: '未知', cls: 'bg-muted text-muted-foreground border-border' },
  } as const;
  const m = map[status];
  return <Badge className={m.cls}>{m.label}</Badge>;
}

type StatusBadgeProps = { status: Channel['status'] };

function StatusBadge({ status }: StatusBadgeProps) {
  const map = {
    active: { label: '启用', cls: 'bg-success/15 text-success border-success/40' },
    disabled: { label: '停用', cls: 'bg-muted text-muted-foreground border-border' },
    cooldown: { label: '冷却中', cls: 'bg-warning/15 text-warning border-warning/40' },
  } as const;
  const m = map[status];
  return <Badge className={m.cls}>{m.label}</Badge>;
}

interface ChannelForm {
  name: string;
  channel_type: ChannelType;
  base_url: string;
  upstream_key: string;
  models: string;
  model_mapping: string;
  priority: string;
  weight: string;
  rate_multiplier: string;
  fail_threshold: string;
  cooldown_seconds: string;
  description: string;
}

const EMPTY_FORM: ChannelForm = {
  name: '',
  channel_type: 'openai',
  base_url: 'https://api.openai.com/v1',
  upstream_key: '',
  models: '',
  model_mapping: '{}',
  priority: '10',
  weight: '1',
  rate_multiplier: '1.0',
  fail_threshold: '3',
  cooldown_seconds: '300',
  description: '',
};

export default function Channels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Channel | null>(null);
  const [form, setForm] = useState<ChannelForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Channel | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [c, m] = await Promise.all([fetchChannels(), fetchModels()]);
      setChannels(c);
      setModels(m);
    } catch (e) {
      toast.error('加载渠道列表失败', { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return channels.filter((c) => {
      if (filterType !== 'all' && c.channel_type !== filterType) return false;
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.base_url.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [channels, filterType, filterStatus, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (c: Channel) => {
    setEditing(c);
    setForm({
      name: c.name,
      channel_type: c.channel_type,
      base_url: c.base_url,
      upstream_key: '',
      models: c.models.join(','),
      model_mapping: JSON.stringify(c.model_mapping ?? {}, null, 0),
      priority: String(c.priority),
      weight: String(c.weight),
      rate_multiplier: String(c.rate_multiplier),
      fail_threshold: String(c.fail_threshold),
      cooldown_seconds: String(c.cooldown_seconds),
      description: c.description ?? '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('请输入渠道名称');
      return;
    }
    if (!form.base_url.trim() || !/^https?:\/\//.test(form.base_url.trim())) {
      toast.error('上游地址必须以 http(s):// 开头');
      return;
    }
    if (!editing && !form.upstream_key.trim()) {
      toast.error('请填写上游 API Key');
      return;
    }
    const modelsArr = form.models.split(/[,，\n]/).map((s) => s.trim()).filter(Boolean);
    if (modelsArr.length === 0) {
      toast.error('请至少填写一个支持的模型');
      return;
    }
    let mapping: Record<string, string> = {};
    if (form.model_mapping.trim() && form.model_mapping.trim() !== '{}') {
      try {
        mapping = JSON.parse(form.model_mapping);
      } catch {
        toast.error('模型映射必须是合法 JSON，如 {"gpt-4o":"azure-gpt4o"}');
        return;
      }
    }
    const nums = { priority: Number(form.priority), weight: Number(form.weight), rate_multiplier: Number(form.rate_multiplier) };
    if (Number.isNaN(nums.priority) || Number.isNaN(nums.weight) || Number.isNaN(nums.rate_multiplier)) {
      toast.error('优先级 / 权重 / 倍率必须为数字');
      return;
    }
    if (nums.rate_multiplier <= 0) {
      toast.error('渠道倍率必须大于 0');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        channel_type: form.channel_type,
        base_url: form.base_url.trim(),
        models: modelsArr,
        model_mapping: mapping,
        priority: nums.priority,
        weight: nums.weight,
        rate_multiplier: nums.rate_multiplier,
        fail_threshold: Number(form.fail_threshold) || 3,
        cooldown_seconds: Number(form.cooldown_seconds) || 300,
        description: form.description || null,
      };
      if (editing) {
        // 上游 Key：留空表示不修改
        if (form.upstream_key.trim()) {
          payload.upstream_key_secret = `vault:enc:${btoa(unescape(encodeURIComponent(form.upstream_key.trim()))).slice(0, 32)}`;
          payload.key_masked = `${form.upstream_key.trim().slice(0, 3)}****${form.upstream_key.trim().slice(-4)}`;
        }
        await saveChannel({ id: editing.id, ...payload } as never);
      } else {
        payload.upstream_key_secret = `vault:enc:${btoa(unescape(encodeURIComponent(form.upstream_key.trim()))).slice(0, 32)}`;
        payload.key_masked = `${form.upstream_key.trim().slice(0, 3)}****${form.upstream_key.trim().slice(-4)}`;
        payload.status = 'active';
        payload.health_status = 'unknown';
        await saveChannel(payload as never);
      }
      toast.success(editing ? '渠道已更新' : '渠道已创建');
      setDialogOpen(false);
      await load();
    } catch (err) {
      toast.error(editing ? '更新失败' : '创建失败', { description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (c: Channel) => {
    const next = c.status === 'disabled' ? 'active' : 'disabled';
    try {
      await setChannelStatus(c.id, next);
      toast.success(next === 'active' ? '渠道已启用' : '渠道已停用');
      await load();
    } catch (e) {
      toast.error('操作失败', { description: (e as Error).message });
    }
  };

  const runHealthCheck = async (c: Channel) => {
    setCheckingId(c.id);
    try {
      const updated = await checkChannelHealth(c.id);
      const label = { healthy: '健康', degraded: '降级', down: '不可用', unknown: '未知' }[updated.health_status];
      toast.success(`健康检查完成：${label}`, {
        description: updated.latency_ms !== null ? `平均延迟 ${updated.latency_ms}ms` : '暂无近期请求样本',
      });
      await load();
    } catch (e) {
      toast.error('健康检查失败', { description: (e as Error).message });
    } finally {
      setCheckingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteChannel(deleteTarget.id);
      toast.success('渠道已删除');
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error('删除失败', { description: (e as Error).message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="tech-label text-[9px] text-muted-foreground/60">FIG 4.1 / UPSTREAMS</div>
          <h1 className="text-xl md:text-2xl font-semibold mt-1 text-balance">上游渠道管理</h1>
          <p className="text-sm text-muted-foreground mt-1">配置上游端点、模型映射、调度优先级与失败冷却</p>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">新增渠道</span>
          <span className="sm:hidden">新增</span>
        </Button>
      </div>

      <div className="bp-card">
        <div className="flex flex-row items-center gap-3 border-b border-border p-3 flex-wrap">
          <div className="relative flex-1 min-w-0 md:min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索渠道名称 / 地址…"
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="渠道类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {Object.entries(CHANNEL_TYPE_LABEL).map(([v, label]) => (
                <SelectItem key={v} value={v}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-32">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="active">启用</SelectItem>
              <SelectItem value="disabled">停用</SelectItem>
              <SelectItem value="cooldown">冷却中</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground shrink-0 border border-border bg-secondary/40 px-3 py-2">
            {filtered.length} / {channels.length} 个渠道
          </div>
        </div>

        <div className="w-full max-w-full overflow-x-auto bg-card">
          <Table className="min-w-[1100px] [&>div]:max-w-full">
            <TableHeader>
              <TableRow className="whitespace-nowrap">
                <TableHead>渠道</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>上游地址</TableHead>
                <TableHead>优先级 / 权重</TableHead>
                <TableHead>倍率</TableHead>
                <TableHead className="text-right">请求 / 成功</TableHead>
                <TableHead className="text-right">延迟</TableHead>
                <TableHead>健康</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    暂无匹配的渠道
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => {
                  const successRate = c.total_requests > 0 ? (c.success_count / c.total_requests) * 100 : null;
                  return (
                    <TableRow key={c.id} className="whitespace-nowrap">
                      <TableCell>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{c.key_masked}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-primary/40 text-primary">
                          {CHANNEL_TYPE_LABEL[c.channel_type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-56">
                        <span className="block truncate font-mono text-xs text-muted-foreground" title={c.base_url}>
                          {c.base_url}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="tabular-nums">P{c.priority}</span>
                        <span className="text-muted-foreground"> / W{c.weight}</span>
                      </TableCell>
                      <TableCell>
                        <span className="tabular-nums">×{c.rate_multiplier}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {c.total_requests.toLocaleString()}
                        {successRate !== null && (
                          <div className="text-[10px] text-muted-foreground">{successRate.toFixed(1)}% 成功</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {c.latency_ms !== null ? `${c.latency_ms}ms` : '-'}
                      </TableCell>
                      <TableCell><HealthBadge status={c.health_status} /></TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1"
                            disabled={checkingId === c.id}
                            onClick={() => runHealthCheck(c)}
                            title="执行健康检查"
                          >
                            {checkingId === c.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <HeartPulse className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden xl:inline">检测</span>
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8" onClick={() => openEdit(c)}>
                            <Pencil className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">编辑</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1"
                            onClick={() => toggleStatus(c)}
                          >
                            <Power className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">{c.status === 'disabled' ? '启用' : '停用'}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(c)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">删除</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 新增/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑渠道' : '新增渠道'}</DialogTitle>
            <DialogDescription>
              {editing
                ? `正在编辑「${editing.name}」；上游 Key 留空表示保持不变`
                : '配置上游端点与调度策略；上游 Key 将加密存储，仅显示脱敏摘要'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="c-name">渠道名称 *</Label>
                <Input
                  id="c-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="如 OpenAI 官方"
                />
              </div>
              <div className="space-y-2">
                <Label>渠道类型 *</Label>
                <Select
                  value={form.channel_type}
                  onValueChange={(v) => {
                    const t = v as ChannelType;
                    setForm({ ...form, channel_type: t, base_url: CHANNEL_TYPE_ENDPOINT[t] });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CHANNEL_TYPE_LABEL).map(([v, label]) => (
                      <SelectItem key={v} value={v}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-url">上游地址（Base URL）*</Label>
              <Input
                id="c-url"
                value={form.base_url}
                onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                placeholder="https://api.openai.com/v1"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-key">上游 API Key {editing ? '（留空不修改）' : '*'}</Label>
              <Input
                id="c-key"
                type="password"
                value={form.upstream_key}
                onChange={(e) => setForm({ ...form, upstream_key: e.target.value })}
                placeholder="sk-…"
                className="font-mono text-sm"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-models">支持的模型 *</Label>
              <Textarea
                id="c-models"
                value={form.models}
                onChange={(e) => setForm({ ...form, models: e.target.value })}
                placeholder="逗号分隔，如 gpt-4o,gpt-4o-mini"
                rows={2}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                可从模型清单选择：
                {models.slice(0, 0).map(() => null)}
                {models.map((m) => m.name).join('、')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-mapping">模型映射（JSON，可选）</Label>
              <Input
                id="c-mapping"
                value={form.model_mapping}
                onChange={(e) => setForm({ ...form, model_mapping: e.target.value })}
                placeholder='{"gpt-4o":"azure-gpt4o-2024-08"}'
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">客户端请求模型名 → 上游实际模型名</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="c-priority">优先级</Label>
                <Input
                  id="c-priority"
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">数字越小优先级越高</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-weight">权重</Label>
                <Input
                  id="c-weight"
                  type="number"
                  min="1"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">同优先级下加权分流</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-rate">渠道倍率</Label>
                <Input
                  id="c-rate"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.rate_multiplier}
                  onChange={(e) => setForm({ ...form, rate_multiplier: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="c-threshold">失败阈值</Label>
                <Input
                  id="c-threshold"
                  type="number"
                  min="1"
                  value={form.fail_threshold}
                  onChange={(e) => setForm({ ...form, fail_threshold: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">连续失败 N 次进入冷却</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-cooldown">冷却时长（秒）</Label>
                <Input
                  id="c-cooldown"
                  type="number"
                  min="10"
                  value={form.cooldown_seconds}
                  onChange={(e) => setForm({ ...form, cooldown_seconds: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-desc">描述</Label>
              <Textarea
                id="c-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="渠道用途备注"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                取消
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? '保存修改' : '创建渠道'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除渠道？</AlertDialogTitle>
            <AlertDialogDescription>
              「{deleteTarget?.name}」将被永久删除，历史流水将保留渠道名称快照。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-start gap-2 text-xs text-muted-foreground border border-border bg-secondary/30 p-3">
        <Activity className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
        <p className="text-pretty">
          调度说明：渠道按优先级升序选择（数字小者优先），同优先级按权重加权轮询；连续失败达到阈值的渠道自动进入冷却期并被临时剔除，冷却结束后经健康探测恢复。
        </p>
      </div>
    </div>
  );
}
