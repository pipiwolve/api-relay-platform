import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Boxes,
  Loader2,
  Pencil,
  Plus,
  Tags,
  Trash2,
  Users,
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  deleteModel,
  deleteModelAlias,
  fetchGroups,
  fetchModelAliases,
  fetchModels,
  fetchRelayUsers,
  recordPriceVersion,
  saveModel,
  saveModelAlias,
  upsertGroup,
} from '@/services/api';
import type { ModelAlias, ModelInfo, RelayUser, UserGroup } from '@/types/types';

// ============ 模型清单 ============
function ModelsTab() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ModelInfo | null>(null);
  const [form, setForm] = useState({
    name: '',
    display_name: '',
    provider: 'openai',
    input_price: '2.5',
    output_price: '10',
    model_rate: '1.0',
    is_public: true,
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ModelInfo | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setModels(await fetchModels());
    } catch (e) {
      toast.error('加载模型失败', { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openEdit = (m: ModelInfo | null) => {
    setEditing(m);
    setForm({
      name: m?.name ?? '',
      display_name: m?.display_name ?? '',
      provider: m?.provider ?? 'openai',
      input_price: m ? String(m.input_price) : '2.5',
      output_price: m ? String(m.output_price) : '10',
      model_rate: m ? String(m.model_rate) : '1.0',
      is_public: m?.is_public ?? true,
      description: m?.description ?? '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('请输入标准模型名');
      return;
    }
    const inputP = Number(form.input_price);
    const outputP = Number(form.output_price);
    const rate = Number(form.model_rate);
    if (Number.isNaN(inputP) || inputP < 0 || Number.isNaN(outputP) || outputP < 0 || Number.isNaN(rate) || rate <= 0) {
      toast.error('单价与倍率必须为合法数字（倍率 > 0）');
      return;
    }
    setSubmitting(true);
    try {
      await saveModel({
        id: editing?.id,
        name: form.name.trim(),
        display_name: form.display_name || null,
        provider: form.provider,
        input_price: inputP,
        output_price: outputP,
        model_rate: rate,
        is_public: form.is_public,
        status: 'active',
        description: form.description || null,
      });
      if (editing) {
        await recordPriceVersion({
          version: `v${new Date().toISOString().slice(0, 10).replace(/-/g, '.')}`,
          target_type: 'model',
          target_name: form.name.trim(),
          old_value: {
            input_price: editing.input_price,
            output_price: editing.output_price,
            model_rate: editing.model_rate,
          },
          new_value: { input_price: inputP, output_price: outputP, model_rate: rate },
          note: editing.display_name ? `调整 ${editing.display_name} 定价` : `调整 ${editing.name} 定价`,
        });
      }
      toast.success(editing ? '模型已更新（价格变更已记录版本）' : '模型已创建');
      setDialogOpen(false);
      await load();
    } catch (err) {
      toast.error('保存失败', { description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <p className="text-sm text-muted-foreground flex-1 min-w-0">
          模型清单：维护标准模型名、输入/输出单价（元/百万 Token）与模型倍率
        </p>
        <Button onClick={() => openEdit(null)} size="sm" className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          新增模型
        </Button>
      </div>
      <div className="bp-card">
        <div className="w-full max-w-full overflow-x-auto bg-card">
          <Table className="min-w-[900px] [&>div]:max-w-full">
            <TableHeader>
              <TableRow className="whitespace-nowrap">
                <TableHead>模型</TableHead>
                <TableHead>厂商</TableHead>
                <TableHead className="text-right">输入单价</TableHead>
                <TableHead className="text-right">输出单价</TableHead>
                <TableHead className="text-right">模型倍率</TableHead>
                <TableHead>白名单</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                models.map((m) => (
                  <TableRow key={m.id} className="whitespace-nowrap">
                    <TableCell>
                      <div className="font-medium">{m.display_name || m.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{m.name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase">{m.provider}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">¥{Number(m.input_price).toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">¥{Number(m.output_price).toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">×{m.model_rate}</TableCell>
                    <TableCell>
                      {m.is_public ? (
                        <Badge className="bg-success/15 text-success border-success/40">开放</Badge>
                      ) : (
                        <Badge variant="secondary">受限</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-8" onClick={() => openEdit(m)}>
                          <Pencil className="w-3.5 h-3.5" />
                          <span className="hidden xl:inline">编辑</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(m)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden xl:inline">删除</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑模型' : '新增模型'}</DialogTitle>
            <DialogDescription>
              单价单位为元/百万 Token；最终计费 = (输入×单价 + 输出×单价) × 模型倍率 × 分组倍率 × 渠道倍率
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="m-name">标准模型名 *</Label>
                <Input
                  id="m-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="gpt-4o"
                  className="font-mono text-sm"
                  disabled={!!editing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-display">显示名称</Label>
                <Input
                  id="m-display"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  placeholder="GPT-4o"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>厂商</Label>
              <Input
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
                placeholder="openai / anthropic / gemini / deepseek / custom"
                className="font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="m-input">输入单价 *</Label>
                <Input
                  id="m-input"
                  type="number"
                  step="0.00000001"
                  min="0"
                  value={form.input_price}
                  onChange={(e) => setForm({ ...form, input_price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-output">输出单价 *</Label>
                <Input
                  id="m-output"
                  type="number"
                  step="0.00000001"
                  min="0"
                  value={form.output_price}
                  onChange={(e) => setForm({ ...form, output_price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-rate">模型倍率 *</Label>
                <Input
                  id="m-rate"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.model_rate}
                  onChange={(e) => setForm({ ...form, model_rate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between border border-border bg-secondary/30 px-4 py-3">
              <div>
                <Label htmlFor="m-public" className="text-sm">开放模型白名单</Label>
                <p className="text-xs text-muted-foreground mt-0.5">关闭后仅显式加入分组白名单的分组可见</p>
              </div>
              <Switch id="m-public" checked={form.is_public} onCheckedChange={(v) => setForm({ ...form, is_public: v })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-desc">描述</Label>
              <Input
                id="m-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="模型简介"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                取消
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                保存
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除模型？</AlertDialogTitle>
            <AlertDialogDescription>「{deleteTarget?.name}」将从模型清单移除，历史流水不受影响。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (deleteTarget) {
                  try {
                    await deleteModel(deleteTarget.id);
                    toast.success('模型已删除');
                    await load();
                  } catch (e) {
                    toast.error('删除失败', { description: (e as Error).message });
                  }
                }
                setDeleteTarget(null);
              }}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============ 模型别名映射 ============
function AliasesTab() {
  const [aliases, setAliases] = useState<ModelAlias[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ client_model: '', upstream_model: '', note: '' });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ModelAlias | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setAliases(await fetchModelAliases());
    } catch (e) {
      toast.error('加载别名失败', { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.client_model.trim() || !form.upstream_model.trim()) {
      toast.error('请填写客户端模型名与上游模型名');
      return;
    }
    setSubmitting(true);
    try {
      await saveModelAlias({
        client_model: form.client_model.trim(),
        upstream_model: form.upstream_model.trim(),
        note: form.note || null,
      });
      toast.success('映射已保存');
      setForm({ client_model: '', upstream_model: '', note: '' });
      await load();
    } catch (err) {
      toast.error('保存失败', { description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        别名映射：客户端请求的模型名 → 转发到渠道时使用的实际模型名
      </p>
      <div className="bp-card p-4">
        <form onSubmit={handleSubmit} className="flex flex-row items-end gap-3 flex-wrap">
          <div className="space-y-2 flex-1 min-w-40">
            <Label htmlFor="a-client" className="tech-label text-[10px] text-muted-foreground">CLIENT MODEL</Label>
            <Input
              id="a-client"
              value={form.client_model}
              onChange={(e) => setForm({ ...form, client_model: e.target.value })}
              placeholder="gpt-4"
              className="font-mono text-sm"
            />
          </div>
          <ArrowRight className="w-4 h-4 text-primary shrink-0 mb-2.5 hidden sm:block" />
          <div className="space-y-2 flex-1 min-w-40">
            <Label htmlFor="a-upstream" className="tech-label text-[10px] text-muted-foreground">UPSTREAM MODEL</Label>
            <Input
              id="a-upstream"
              value={form.upstream_model}
              onChange={(e) => setForm({ ...form, upstream_model: e.target.value })}
              placeholder="gpt-4o"
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2 flex-1 min-w-40">
            <Label htmlFor="a-note" className="tech-label text-[10px] text-muted-foreground">NOTE</Label>
            <Input
              id="a-note"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="备注"
            />
          </div>
          <Button type="submit" disabled={submitting} className="gap-2 mb-0">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            添加映射
          </Button>
        </form>
      </div>

      <div className="bp-card">
        <div className="w-full max-w-full overflow-x-auto bg-card">
          <Table className="min-w-[680px] [&>div]:max-w-full">
            <TableHeader>
              <TableRow className="whitespace-nowrap">
                <TableHead>客户端模型名</TableHead>
                <TableHead></TableHead>
                <TableHead>上游模型名</TableHead>
                <TableHead>备注</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : aliases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    暂无别名映射
                  </TableCell>
                </TableRow>
              ) : (
                aliases.map((a) => (
                  <TableRow key={a.id} className="whitespace-nowrap">
                    <TableCell className="font-mono text-sm">{a.client_model}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <ArrowRight className="w-4 h-4 text-primary" />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{a.upstream_model}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{a.note ?? '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(a)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden xl:inline">删除</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该映射？</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.client_model} → {deleteTarget?.upstream_model} 的别名将立即失效。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (deleteTarget) {
                  try {
                    await deleteModelAlias(deleteTarget.id);
                    toast.success('映射已删除');
                    await load();
                  } catch (e) {
                    toast.error('删除失败', { description: (e as Error).message });
                  }
                }
                setDeleteTarget(null);
              }}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============ 分组管理 ============
function GroupsTab() {
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [users, setUsers] = useState<RelayUser[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserGroup | null>(null);
  const [form, setForm] = useState({
    name: '',
    display_name: '',
    rate_multiplier: '1.0',
    allowed_models: '',
    description: '',
    is_default: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [g, u, m] = await Promise.all([fetchGroups(), fetchRelayUsers(), fetchModels()]);
      setGroups(g);
      setUsers(u);
      setModels(m);
    } catch (e) {
      toast.error('加载分组失败', { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const userCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of users) map.set(u.group_id, (map.get(u.group_id) ?? 0) + 1);
    return map;
  }, [users]);

  const openEdit = (g: UserGroup | null) => {
    setEditing(g);
    setForm({
      name: g?.name ?? '',
      display_name: g?.display_name ?? '',
      rate_multiplier: g ? String(g.rate_multiplier) : '1.0',
      allowed_models: g ? g.allowed_models.join(',') : '',
      description: g?.description ?? '',
      is_default: g?.is_default ?? false,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('请输入分组标识');
      return;
    }
    const rate = Number(form.rate_multiplier);
    if (Number.isNaN(rate) || rate <= 0) {
      toast.error('分组倍率必须为大于 0 的数字');
      return;
    }
    setSubmitting(true);
    try {
      const oldGroup = editing;
      await upsertGroup({
        id: editing?.id,
        name: form.name.trim(),
        display_name: form.display_name || null,
        rate_multiplier: rate,
        allowed_models: form.allowed_models.split(/[,，\n]/).map((s) => s.trim()).filter(Boolean),
        description: form.description || null,
        is_default: form.is_default,
      });
      if (oldGroup && Number(oldGroup.rate_multiplier) !== rate) {
        await recordPriceVersion({
          version: `v${new Date().toISOString().slice(0, 10).replace(/-/g, '.')}`,
          target_type: 'group',
          target_name: form.name.trim(),
          old_value: { rate_multiplier: oldGroup.rate_multiplier },
          new_value: { rate_multiplier: rate },
          note: `调整 ${oldGroup.display_name ?? oldGroup.name} 分组倍率`,
        });
      }
      toast.success(editing ? '分组已更新（倍率变更已记录版本）' : '分组已创建');
      setDialogOpen(false);
      await load();
    } catch (err) {
      toast.error('保存失败', { description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <p className="text-sm text-muted-foreground flex-1 min-w-0">
          分组倍率与模型白名单：最终计费 = 模型倍率 × 分组倍率 × 渠道倍率；白名单留空表示开放全部模型
        </p>
        <Button onClick={() => openEdit(null)} size="sm" className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          新增分组
        </Button>
      </div>

      <div className="bp-card">
        <div className="w-full max-w-full overflow-x-auto bg-card">
          <Table className="min-w-[900px] [&>div]:max-w-full">
            <TableHeader>
              <TableRow className="whitespace-nowrap">
                <TableHead>分组</TableHead>
                <TableHead className="text-right">分组倍率</TableHead>
                <TableHead>模型白名单</TableHead>
                <TableHead className="text-right">用户数</TableHead>
                <TableHead>描述</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                groups.map((g) => (
                  <TableRow key={g.id} className="whitespace-nowrap">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{g.display_name || g.name}</span>
                        {g.is_default && <Badge variant="outline" className="border-primary/40 text-primary">默认</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">{g.name}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">×{g.rate_multiplier}</TableCell>
                    <TableCell className="max-w-64">
                      {g.allowed_models.length === 0 ? (
                        <span className="text-muted-foreground text-xs">全部开放模型</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {g.allowed_models.slice(0, 3).map((m) => (
                            <Badge key={m} variant="secondary" className="font-mono text-[10px]">{m}</Badge>
                          ))}
                          {g.allowed_models.length > 3 && (
                            <Badge variant="secondary" className="text-[10px]">+{g.allowed_models.length - 3}</Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{userCount.get(g.id) ?? 0}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-56">
                      <span className="block truncate" title={g.description ?? ''}>{g.description ?? '-'}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8" onClick={() => openEdit(g)}>
                        <Pencil className="w-3.5 h-3.5" />
                        <span className="hidden xl:inline">编辑</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑分组' : '新增分组'}</DialogTitle>
            <DialogDescription>分组决定用户可见的模型白名单与计费倍率乘数</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="g-name">分组标识 *</Label>
                <Input
                  id="g-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="premium"
                  className="font-mono text-sm"
                  disabled={!!editing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="g-display">显示名称</Label>
                <Input
                  id="g-display"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  placeholder="高级客户"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="g-rate">分组倍率 *</Label>
              <Input
                id="g-rate"
                type="number"
                step="0.01"
                min="0.01"
                value={form.rate_multiplier}
                onChange={(e) => setForm({ ...form, rate_multiplier: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">如 0.8 表示按模型原价 8 折计费</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="g-models">模型白名单（逗号分隔，留空 = 全部开放模型）</Label>
              <Input
                id="g-models"
                value={form.allowed_models}
                onChange={(e) => setForm({ ...form, allowed_models: e.target.value })}
                placeholder={models.map((m) => m.name).slice(0, 2).join(',')}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex items-center justify-between border border-border bg-secondary/30 px-4 py-3">
              <div>
                <Label htmlFor="g-default" className="text-sm">默认分组</Label>
                <p className="text-xs text-muted-foreground mt-0.5">新用户默认归入该分组</p>
              </div>
              <Switch id="g-default" checked={form.is_default} onCheckedChange={(v) => setForm({ ...form, is_default: v })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="g-desc">描述</Label>
              <Input
                id="g-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="分组说明"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                取消
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                保存
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ 页面主体：Tabs 切换 ============
export default function ModelsGroups() {
  return (
    <div className="space-y-6">
      <div>
        <div className="tech-label text-[9px] text-muted-foreground/60">FIG 5.1 / CATALOG & TIERS</div>
        <h1 className="text-xl md:text-2xl font-semibold mt-1 text-balance">模型与分组管理</h1>
        <p className="text-sm text-muted-foreground mt-1">模型清单、别名映射与分组计费倍率配置</p>
      </div>

      <Tabs defaultValue="models" className="space-y-4">
        <TabsList>
          <TabsTrigger value="models" className="gap-1.5">
            <Boxes className="w-4 h-4" />
            模型清单
          </TabsTrigger>
          <TabsTrigger value="aliases" className="gap-1.5">
            <Tags className="w-4 h-4" />
            别名映射
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-1.5">
            <Users className="w-4 h-4" />
            分组与倍率
          </TabsTrigger>
        </TabsList>
        <TabsContent value="models">
          <ModelsTab />
        </TabsContent>
        <TabsContent value="aliases">
          <AliasesTab />
        </TabsContent>
        <TabsContent value="groups">
          <GroupsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
