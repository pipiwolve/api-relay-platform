import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  KeyRound,
  Loader2,
  Plus,
  RefreshCcw,
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  deleteApiKey,
  fetchApiKeys,
  fetchRelayUsers,
  issueApiKey,
  rotateApiKey,
  setApiKeyStatus,
} from '@/services/api';
import type { ApiKey, RelayUser } from '@/types/types';

function maskKey(k: ApiKey): string {
  return `${k.key_prefix}****${k.key_suffix}`;
}

function formatDate(s: string | null): string {
  if (!s) return '-';
  return new Date(s).toLocaleString('zh-CN', { hour12: false });
}

export default function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [users, setUsers] = useState<RelayUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterUser, setFilterUser] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [issueOpen, setIssueOpen] = useState(false);
  const [form, setForm] = useState({ name: '', user_id: '', quota_limit: '', expires_days: '0' });
  const [submitting, setSubmitting] = useState(false);

  // 明文一次性展示
  const [plainKey, setPlainKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);

  const [rotateTarget, setRotateTarget] = useState<ApiKey | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [k, u] = await Promise.all([fetchApiKeys(), fetchRelayUsers()]);
      setKeys(k);
      setUsers(u);
    } catch (e) {
      toast.error('加载 API Key 列表失败', { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const filtered = useMemo(() => {
    return keys.filter((k) => {
      if (filterUser !== 'all' && k.user_id !== filterUser) return false;
      if (filterStatus !== 'all' && k.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        const uname = k.relay_users?.username?.toLowerCase() ?? '';
        if (!k.name.toLowerCase().includes(q) && !k.key_prefix.toLowerCase().includes(q) && !uname.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [keys, filterUser, filterStatus, search]);

  const submitIssue = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('请输入 Key 名称');
      return;
    }
    if (!form.user_id) {
      toast.error('请选择所属用户');
      return;
    }
    if (form.quota_limit !== '' && (Number.isNaN(Number(form.quota_limit)) || Number(form.quota_limit) < 0)) {
      toast.error('Key 额度上限必须为非负数字');
      return;
    }
    setSubmitting(true);
    try {
      const days = Number(form.expires_days);
      const { plain } = await issueApiKey({
        name: form.name.trim(),
        user_id: form.user_id,
        quota_limit: form.quota_limit === '' ? null : Number(form.quota_limit),
        expires_at: days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null,
      });
      setIssueOpen(false);
      setPlainKey(plain);
      setCopied(false);
      setForm({ name: '', user_id: '', quota_limit: '', expires_days: '0' });
      await load();
    } catch (err) {
      toast.error('签发失败', { description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const copyPlain = async (plain: string) => {
    try {
      await navigator.clipboard.writeText(plain);
      setCopied(true);
      toast.success('已复制到剪贴板');
    } catch {
      toast.error('复制失败，请手动选择复制');
    }
  };

  const confirmRotate = async () => {
    if (!rotateTarget) return;
    setRotating(true);
    try {
      const { plain } = await rotateApiKey(rotateTarget.id);
      setRotateTarget(null);
      setPlainKey(plain);
      setCopied(false);
      await load();
    } catch (e) {
      toast.error('轮换失败', { description: (e as Error).message });
    } finally {
      setRotating(false);
    }
  };

  const toggleStatus = async (k: ApiKey) => {
    const next = k.status === 'active' ? 'disabled' : 'active';
    try {
      await setApiKeyStatus(k.id, next);
      toast.success(next === 'active' ? 'Key 已启用' : 'Key 已禁用');
      await load();
    } catch (e) {
      toast.error('操作失败', { description: (e as Error).message });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteApiKey(deleteTarget.id);
      toast.success('Key 已删除');
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
          <div className="tech-label text-[9px] text-muted-foreground/60">FIG 3.1 / CREDENTIALS</div>
          <h1 className="text-xl md:text-2xl font-semibold mt-1 text-balance">API Key 管理</h1>
          <p className="text-sm text-muted-foreground mt-1">签发与轮换站内 Key；库中仅存 SHA-256 摘要</p>
        </div>
        <Button
          onClick={() => {
            setForm({ name: '', user_id: '', quota_limit: '', expires_days: '0' });
            setIssueOpen(true);
          }}
          className="gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">签发 Key</span>
          <span className="sm:hidden">签发</span>
        </Button>
      </div>

      {/* 筛选区 */}
      <div className="bp-card">
        <div className="flex flex-row items-center gap-3 border-b border-border p-3 flex-wrap">
          <div className="relative flex-1 min-w-0 md:min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索 Key 名称 / 前缀 / 用户…"
              className="pl-9"
            />
          </div>
          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger className="w-full md:w-44">
              <SelectValue placeholder="按用户筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部用户</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.display_name || u.username}
                </SelectItem>
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
              <SelectItem value="disabled">禁用</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground shrink-0 border border-border bg-secondary/40 px-3 py-2">
            {filtered.length} / {keys.length} 个 Key
          </div>
        </div>

        <div className="w-full max-w-full overflow-x-auto bg-card">
          <Table className="min-w-[1000px] [&>div]:max-w-full">
            <TableHeader>
              <TableRow className="whitespace-nowrap">
                <TableHead>名称</TableHead>
                <TableHead>所属用户</TableHead>
                <TableHead>Key 摘要</TableHead>
                <TableHead className="text-right">已用额度</TableHead>
                <TableHead className="text-right">请求数</TableHead>
                <TableHead>到期时间</TableHead>
                <TableHead>最后使用</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    <KeyRound className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    暂无匹配的 API Key
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((k) => {
                  const u = userMap.get(k.user_id);
                  const expired = k.expires_at !== null && new Date(k.expires_at).getTime() < Date.now();
                  return (
                    <TableRow key={k.id} className="whitespace-nowrap">
                      <TableCell className="font-medium">{k.name}</TableCell>
                      <TableCell>
                        <div>{u?.display_name || k.relay_users?.username || '-'}</div>
                        <div className="text-xs text-muted-foreground font-mono">{k.relay_users?.username ?? ''}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{maskKey(k)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        ¥{k.used_quota.toFixed(2)}
                        {k.quota_limit !== null && (
                          <div className="text-[10px] text-muted-foreground">/ ¥{k.quota_limit.toFixed(2)}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{k.request_count.toLocaleString()}</TableCell>
                      <TableCell>
                        {k.expires_at ? (
                          <span className={expired ? 'text-destructive' : 'text-muted-foreground'}>
                            {new Date(k.expires_at).toLocaleDateString('zh-CN')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">永不过期</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(k.last_used_at)}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            k.status === 'active'
                              ? 'bg-success/15 text-success border border-success/40'
                              : 'bg-destructive/15 text-destructive border border-destructive/40'
                          }
                        >
                          {k.status === 'active' ? '启用' : '禁用'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1"
                            onClick={() => setRotateTarget(k)}
                            title="轮换：生成新明文并使旧 Key 失效"
                          >
                            <RefreshCcw className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">轮换</span>
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8" onClick={() => toggleStatus(k)}>
                            {k.status === 'active' ? '禁用' : '启用'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(k)}
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

      {/* 签发对话框 */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>签发 API Key</DialogTitle>
            <DialogDescription>
              明文仅在签发成功后展示一次，数据库只保存 SHA-256 摘要；请务必复制保存
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitIssue} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="k-name">Key 名称 *</Label>
              <Input
                id="k-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="如 生产环境 Key"
              />
            </div>
            <div className="space-y-2">
              <Label>所属用户 *</Label>
              <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="选择用户" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter((u) => u.status === 'active')
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.display_name || u.username}（{u.username}）
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="k-quota">Key 额度上限（可选）</Label>
                <Input
                  id="k-quota"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.quota_limit}
                  onChange={(e) => setForm({ ...form, quota_limit: e.target.value })}
                  placeholder="留空表示不限"
                />
              </div>
              <div className="space-y-2">
                <Label>有效期</Label>
                <Select value={form.expires_days} onValueChange={(v) => setForm({ ...form, expires_days: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">永不过期</SelectItem>
                    <SelectItem value="30">30 天</SelectItem>
                    <SelectItem value="90">90 天</SelectItem>
                    <SelectItem value="365">365 天</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIssueOpen(false)} disabled={submitting}>
                取消
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                签发
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 明文一次性展示对话框 */}
      <Dialog
        open={!!plainKey}
        onOpenChange={(v) => {
          if (!v) setPlainKey(null);
        }}
      >
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Key 明文仅展示一次
            </DialogTitle>
            <DialogDescription>
              请立即复制并妥善保存。关闭本窗口后，任何人都无法再次查看该明文；数据库仅保留不可逆摘要。
            </DialogDescription>
          </DialogHeader>
          <div className="border border-primary/40 bg-secondary/60 p-3 font-mono text-sm break-all select-all">
            {plainKey}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlainKey(null)}>
              我已保存，关闭
            </Button>
            <Button onClick={() => plainKey && copyPlain(plainKey)} className="gap-2">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? '已复制' : '复制 Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 轮换确认 */}
      <AlertDialog open={!!rotateTarget} onOpenChange={(v) => !v && setRotateTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>确认轮换该 Key？</AlertDialogTitle>
            <AlertDialogDescription>
              将为「{rotateTarget?.name}」生成全新明文，旧明文立即失效；持有旧 Key 的客户端将收到 401。轮换后新明文仅展示一次。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rotating}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRotate} className="gap-2">
              {rotating && <Loader2 className="w-4 h-4 animate-spin" />}
              确认轮换
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除该 Key？</AlertDialogTitle>
            <AlertDialogDescription>
              「{deleteTarget?.name}」将被永久删除，使用该 Key 的客户端将立即收到 401，历史流水保留 Key 摘要信息。
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
