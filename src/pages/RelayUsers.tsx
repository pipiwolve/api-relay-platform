import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Coins, Loader2, Plus, Search, Users as UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  adjustBalance,
  createRelayUser,
  deleteRelayUser,
  fetchGroups,
  fetchRelayUsers,
  updateRelayUser,
} from '@/services/api';
import type { RelayUser, UserGroup } from '@/types/types';

export default function RelayUsers() {
  const [users, setUsers] = useState<RelayUser[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');

  // 创建/编辑弹窗
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RelayUser | null>(null);
  const [form, setForm] = useState({
    username: '',
    display_name: '',
    email: '',
    group_id: '',
    balance: '0',
    quota_limit: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // 充值弹窗
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [rechargeUser, setRechargeUser] = useState<RelayUser | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeMode, setRechargeMode] = useState<'add' | 'sub'>('add');

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<RelayUser | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [u, g] = await Promise.all([fetchRelayUsers(), fetchGroups()]);
      setUsers(u);
      setGroups(g);
    } catch (e) {
      toast.error('加载用户列表失败', { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // 搜索（简单前端过滤 + 后端关键字查询）
  useEffect(() => {
    if (search === keyword) return;
    const t = setTimeout(async () => {
      setKeyword(search);
      try {
        const u = await fetchRelayUsers(search || undefined);
        setUsers(u);
      } catch {
        // 忽略
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const groupMap = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      username: '',
      display_name: '',
      email: '',
      group_id: groups.find((g) => g.is_default)?.id ?? groups[0]?.id ?? '',
      balance: '0',
      quota_limit: '',
      notes: '',
    });
    setDialogOpen(true);
  };

  const openEdit = (u: RelayUser) => {
    setEditing(u);
    setForm({
      username: u.username,
      display_name: u.display_name ?? '',
      email: u.email ?? '',
      group_id: u.group_id,
      balance: String(u.balance),
      quota_limit: u.quota_limit === null ? '' : String(u.quota_limit),
      notes: u.notes ?? '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.username.trim()) {
      toast.error('请输入用户标识（username）');
      return;
    }
    if (!form.group_id) {
      toast.error('请选择所属分组');
      return;
    }
    const balance = Number(form.balance);
    if (Number.isNaN(balance) || balance < 0) {
      toast.error('初始额度必须为非负数字');
      return;
    }
    if (form.quota_limit !== '' && (Number.isNaN(Number(form.quota_limit)) || Number(form.quota_limit) < 0)) {
      toast.error('额度上限必须为非负数字');
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await updateRelayUser(editing.id, {
          display_name: form.display_name || null,
          email: form.email || null,
          group_id: form.group_id,
          balance,
          quota_limit: form.quota_limit === '' ? null : Number(form.quota_limit),
          notes: form.notes || null,
        });
        toast.success('用户已更新');
      } else {
        await createRelayUser({
          username: form.username.trim(),
          display_name: form.display_name || null,
          email: form.email || null,
          group_id: form.group_id,
          balance,
          quota_limit: form.quota_limit === '' ? null : Number(form.quota_limit),
          notes: form.notes || null,
        });
        toast.success('用户创建成功');
      }
      setDialogOpen(false);
      await load();
    } catch (err) {
      toast.error(editing ? '更新失败' : '创建失败', { description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (u: RelayUser) => {
    const next = u.status === 'active' ? 'disabled' : 'active';
    try {
      await updateRelayUser(u.id, { status: next });
      toast.success(next === 'active' ? '已启用' : '已禁用');
      await load();
    } catch (e) {
      toast.error('操作失败', { description: (e as Error).message });
    }
  };

  const submitRecharge = async () => {
    if (!rechargeUser) return;
    const amt = Number(rechargeAmount);
    if (rechargeAmount === '' || Number.isNaN(amt) || amt <= 0) {
      toast.error('请输入大于 0 的有效金额');
      return;
    }
    const delta = rechargeMode === 'add' ? amt : -amt;
    setSubmitting(true);
    try {
      await adjustBalance(rechargeUser.id, delta);
      toast.success(rechargeMode === 'add' ? `已充值 ¥${amt.toFixed(2)}` : `已扣减 ¥${amt.toFixed(2)}`);
      setRechargeOpen(false);
      setRechargeAmount('');
      await load();
    } catch (e) {
      const msg = (e as Error).message.includes('BALANCE_NEGATIVE')
        ? '扣减后余额将为负，操作被拒绝'
        : (e as Error).message;
      toast.error('操作失败', { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRelayUser(deleteTarget.id);
      toast.success(`用户 ${deleteTarget.username} 及其 API Key 已删除`);
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
          <div className="tech-label text-[9px] text-muted-foreground/60">FIG 2.1 / TENANTS</div>
          <h1 className="text-xl md:text-2xl font-semibold mt-1 text-balance">用户管理</h1>
          <p className="text-sm text-muted-foreground mt-1">管理下游租户账号、分组归属与额度</p>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">创建用户</span>
          <span className="sm:hidden">创建</span>
        </Button>
      </div>

      <div className="bp-card">
        <div className="flex items-center gap-3 border-b border-border p-3 flex-row">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索用户名 / 显示名称…"
              className="pl-9"
            />
          </div>
          <div className="text-xs text-muted-foreground shrink-0 border border-border bg-secondary/40 px-3 py-2">
            共 {users.length} 个用户
          </div>
        </div>

        <div className="w-full max-w-full overflow-x-auto bg-card">
          <Table className="min-w-[980px] [&>div]:max-w-full">
            <TableHeader>
              <TableRow className="whitespace-nowrap">
                <TableHead>用户</TableHead>
                <TableHead>所属分组</TableHead>
                <TableHead className="text-right">余额</TableHead>
                <TableHead className="text-right">已消耗</TableHead>
                <TableHead className="text-right">额度上限</TableHead>
                <TableHead>状态</TableHead>
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
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <UsersIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    暂无用户，点击右上角创建
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => {
                  const g = groupMap.get(u.group_id);
                  return (
                    <TableRow key={u.id} className="whitespace-nowrap">
                      <TableCell>
                        <div className="font-medium">{u.display_name || u.username}</div>
                        <div className="text-xs text-muted-foreground font-mono">{u.username}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-primary/40 text-primary">
                          {g?.display_name ?? g?.name ?? '-'}
                        </Badge>
                        {g && <div className="text-[10px] text-muted-foreground mt-0.5">倍率 ×{g.rate_multiplier}</div>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">¥{u.balance.toFixed(2)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">¥{u.total_consumed.toFixed(2)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {u.quota_limit === null ? '不限' : `¥${u.quota_limit.toFixed(2)}`}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            u.status === 'active'
                              ? 'bg-success/15 text-success border border-success/40'
                              : 'bg-destructive/15 text-destructive border border-destructive/40'
                          }
                        >
                          {u.status === 'active' ? '正常' : '禁用'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 h-8"
                            onClick={() => {
                              setRechargeUser(u);
                              setRechargeMode('add');
                              setRechargeAmount('');
                              setRechargeOpen(true);
                            }}
                          >
                            <Coins className="w-3.5 h-3.5" />
                            <span className="hidden lg:inline">充值</span>
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8" onClick={() => openEdit(u)}>
                            <span className="hidden lg:inline">编辑</span>
                            <span className="lg:hidden">编辑</span>
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8" onClick={() => toggleStatus(u)}>
                            {u.status === 'active' ? '禁用' : '启用'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(u)}
                          >
                            删除
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

      {/* 创建/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑用户' : '创建用户'}</DialogTitle>
            <DialogDescription>
              {editing ? `正在编辑用户 ${editing.username}` : '创建下游租户账号，签发 Key 前请先创建用户'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="f-username">用户标识 *</Label>
              <Input
                id="f-username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="如 acme-tech"
                disabled={!!editing}
              />
              <p className="text-xs text-muted-foreground">唯一标识，创建后不可修改</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="f-display">显示名称</Label>
                <Input
                  id="f-display"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  placeholder="如 Acme 科技"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-email">联系邮箱</Label>
                <Input
                  id="f-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ops@example.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>所属分组 *</Label>
              <Select value={form.group_id} onValueChange={(v) => setForm({ ...form, group_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="选择分组" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.display_name || g.name}（倍率 ×{g.rate_multiplier}）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">分组决定可见渠道与计费倍率</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="f-balance">{editing ? '当前余额' : '初始额度'}</Label>
                <Input
                  id="f-balance"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.balance}
                  onChange={(e) => setForm({ ...form, balance: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-quota">额度上限（可选）</Label>
                <Input
                  id="f-quota"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.quota_limit}
                  onChange={(e) => setForm({ ...form, quota_limit: e.target.value })}
                  placeholder="留空表示不限"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-notes">备注</Label>
              <Textarea
                id="f-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="客户类型、对账方式等"
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                取消
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? '保存修改' : '创建用户'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 充值对话框 */}
      <Dialog open={rechargeOpen} onOpenChange={setRechargeOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle>额度调整</DialogTitle>
            <DialogDescription>
              {rechargeUser ? `用户：${rechargeUser.display_name || rechargeUser.username}（当前余额 ¥${rechargeUser.balance.toFixed(2)}）` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>操作类型</Label>
              <Select value={rechargeMode} onValueChange={(v) => setRechargeMode(v as 'add' | 'sub')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">充值（增加额度）</SelectItem>
                  <SelectItem value="sub">扣减（减少额度）</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recharge-amt">金额（¥）</Label>
              <Input
                id="recharge-amt"
                type="number"
                step="0.01"
                min="0.01"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                placeholder="100.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechargeOpen(false)} disabled={submitting}>
              取消
            </Button>
            <Button onClick={submitRecharge} disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              确认执行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除用户？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除用户 {deleteTarget?.username} 及其名下所有 API Key 与关联流水引用，该操作不可恢复。
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
    </div>
  );
}
