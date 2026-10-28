import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Ban,
  Check,
  Copy,
  KeyRound,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { deleteApiKey, issueApiKey, rotateApiKey, setApiKeyStatus } from '@/services/api';
import { fetchMyApiKeys } from '@/services/portal';
import type { ApiKey } from '@/types/types';

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('zh-CN', { hour12: false });
}

/** 明文一次性展示弹窗（签发/轮换共用）：仅此一次，平台只存 SHA-256 摘要 */
function PlainKeyDialog({ plain, onClose }: { plain: string | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    setCopied(false);
  }, [plain]);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plain ?? '');
      setCopied(true);
      toast.success('Key 已复制，请立即妥善保存');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败', { description: '请手动选择复制' });
    }
  };
  return (
    <Dialog open={plain !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-left">
            <KeyRound className="w-4 h-4 text-primary" />
            API Key 明文（仅展示一次）
          </DialogTitle>
          <DialogDescription className="text-pretty">
            出于安全考虑，明文仅在此时展示一次，平台仅存储 SHA-256 摘要。请立即复制并保存到安全位置（如环境变量或密钥管理服务），关闭后将无法再次查看。
          </DialogDescription>
        </DialogHeader>
        <div className="border border-primary/40 bg-primary/5 rounded-md p-3">
          <code className="block font-mono text-sm break-all text-primary leading-relaxed select-all">{plain}</code>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>我已保存，关闭</Button>
          <Button onClick={handleCopy} className="gap-1.5">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? '已复制' : '复制 Key'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 我的 API Key：仅本人 Key 的签发 / 启停 / 轮换 / 删除（RLS 保证数据隔离） */
export default function MyKeys() {
  const { relayProfile } = useAuth();
  const relayUserId = relayProfile?.id;

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [quotaLimit, setQuotaLimit] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [creating, setCreating] = useState(false);

  const [plainKey, setPlainKey] = useState<string | null>(null);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<ApiKey | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!relayUserId) return;
    setLoading(true);
    try {
      setKeys(await fetchMyApiKeys(relayUserId));
    } catch (e) {
      toast.error('Key 列表加载失败', { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [relayUserId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!relayUserId) return;
    if (!name.trim()) {
      toast.error('请填写 Key 名称');
      return;
    }
    const quota = quotaLimit.trim() ? Number(quotaLimit) : null;
    if (quota !== null && (Number.isNaN(quota) || quota < 0)) {
      toast.error('额度上限格式不正确');
      return;
    }
    setCreating(true);
    try {
      const { plain } = await issueApiKey({
        name: name.trim(),
        user_id: relayUserId,
        quota_limit: quota,
        expires_at: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
      });
      toast.success('API Key 签发成功');
      setPlainKey(plain);
      setCreateOpen(false);
      setName('');
      setQuotaLimit('');
      setExpiresAt('');
      await load();
    } catch (err) {
      toast.error('签发失败', { description: (err as Error).message });
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (key: ApiKey) => {
    const next = key.status === 'active' ? 'disabled' : 'active';
    setBusyId(key.id);
    try {
      await setApiKeyStatus(key.id, next);
      toast.success(next === 'active' ? 'Key 已启用' : 'Key 已禁用');
      await load();
    } catch (e) {
      toast.error('状态更新失败', { description: (e as Error).message });
    } finally {
      setBusyId(null);
    }
  };

  const handleRotate = async () => {
    if (!rotatingId) return;
    const id = rotatingId;
    setRotatingId(null);
    setBusyId(id);
    try {
      const { plain } = await rotateApiKey(id);
      toast.success('Key 已轮换，旧明文立即失效');
      setPlainKey(plain);
      await load();
    } catch (e) {
      toast.error('轮换失败', { description: (e as Error).message });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingKey) return;
    const key = deletingKey;
    setDeletingKey(null);
    setBusyId(key.id);
    try {
      await deleteApiKey(key.id);
      toast.success(`已删除 Key「${key.name}」`);
      await load();
    } catch (e) {
      toast.error('删除失败', { description: (e as Error).message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="tech-label text-[9px] text-muted-foreground/60">FIG 5.1 / MY API KEYS</div>
          <h1 className="text-xl md:text-2xl font-semibold mt-1 text-balance">我的 API Key</h1>
          <p className="text-sm text-muted-foreground mt-1">签发与管理本人调用密钥，明文仅签发/轮换时展示一次</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5 shrink-0">
          <Plus className="w-4 h-4" />
          新建 Key
        </Button>
      </div>

      <SpringIn>
        <Card className="bp-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Key 列表
            </CardTitle>
            <CardDescription>仅展示当前账号名下的 Key，共 {keys.length} 个</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : keys.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <KeyRound className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">还没有 API Key，点击右上角「新建 Key」签发第一个密钥</p>
              </div>
            ) : (
              <div className="w-full max-w-full overflow-x-auto bg-card">
                <Table className="[&>div]:max-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">名称</TableHead>
                      <TableHead className="whitespace-nowrap">Key 摘要</TableHead>
                      <TableHead className="whitespace-nowrap">状态</TableHead>
                      <TableHead className="whitespace-nowrap">额度</TableHead>
                      <TableHead className="whitespace-nowrap">创建时间</TableHead>
                      <TableHead className="whitespace-nowrap">最后使用</TableHead>
                      <TableHead className="whitespace-nowrap text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keys.map((key) => (
                      <TableRow key={key.id}>
                        <TableCell className="whitespace-nowrap font-medium">{key.name}</TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                          {key.key_prefix}
                          <span className="text-muted-foreground/40">····</span>
                          {key.key_suffix}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge
                            variant={key.status === 'active' ? 'default' : 'secondary'}
                            className={
                              key.status === 'active'
                                ? 'border-success/40 bg-success/10 text-success'
                                : ''
                            }
                          >
                            {key.status === 'active' ? '启用中' : '已禁用'}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                          {key.quota_limit === null ? '不限' : `¥${Number(key.used_quota).toFixed(2)} / ${Number(key.quota_limit).toFixed(2)}`}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground text-xs">{formatTime(key.created_at)}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground text-xs">{formatTime(key.last_used_at)}</TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleToggle(key)}
                              disabled={busyId === key.id}
                              aria-label={key.status === 'active' ? '禁用' : '启用'}
                              title={key.status === 'active' ? '禁用' : '启用'}
                            >
                              {busyId === key.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : key.status === 'active' ? (
                                <Ban className="w-3.5 h-3.5 text-warning" />
                              ) : (
                                <Play className="w-3.5 h-3.5 text-success" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setRotatingId(key.id)}
                              disabled={busyId === key.id}
                              aria-label="轮换"
                              title="轮换（生成新明文，旧明文失效）"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setDeletingKey(key)}
                              disabled={busyId === key.id}
                              aria-label="删除"
                              title="删除"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </SpringIn>

      {/* 新建 Key 弹窗 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-left">
              <Plus className="w-4 h-4 text-primary" />
              新建 API Key
            </DialogTitle>
            <DialogDescription className="text-pretty">
              签发成功后明文仅展示一次；额度与过期时间为选填项，留空即不限制 / 永不过期。
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="k-name" className="tech-label text-[10px] text-muted-foreground">NAME / 名称 *</Label>
              <Input
                id="k-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="如：生产环境调用 Key"
                maxLength={50}
                disabled={creating}
              />
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="k-quota" className="tech-label text-[10px] text-muted-foreground">QUOTA / 额度上限</Label>
                <Input
                  id="k-quota"
                  value={quotaLimit}
                  onChange={(e) => setQuotaLimit(e.target.value)}
                  placeholder="留空不限制"
                  inputMode="decimal"
                  disabled={creating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="k-expire" className="tech-label text-[10px] text-muted-foreground">EXPIRES / 过期日期</Label>
                <Input
                  id="k-expire"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  disabled={creating}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
                取消
              </Button>
              <Button type="submit" disabled={creating} className="gap-1.5">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                签发 Key
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 明文一次性展示 */}
      <PlainKeyDialog plain={plainKey} onClose={() => setPlainKey(null)} />

      {/* 轮换确认 */}
      <AlertDialog open={rotatingId !== null} onOpenChange={(open) => !open && setRotatingId(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-left">
              <RefreshCw className="w-4 h-4 text-primary" />
              确认轮换该 Key？
            </AlertDialogTitle>
            <AlertDialogDescription className="text-pretty">
              轮换会生成新的 Key 明文并立即替换摘要，旧明文将立即失效。正在使用该 Key 的服务需同步更新配置。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleRotate}>确认轮换</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除确认 */}
      <AlertDialog open={deletingKey !== null} onOpenChange={(open) => !open && setDeletingKey(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-left">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              确认删除 Key「{deletingKey?.name}」？
            </AlertDialogTitle>
            <AlertDialogDescription className="text-pretty">
              删除后该 Key 立即失效且不可恢复，正在使用它的调用将返回 401。建议先在业务侧完成 Key 替换。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
