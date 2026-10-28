import { useEffect, useState } from 'react';
import { KeyRound, Loader2, Save, Lock, CheckCircle2, User, Coins, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { SpringIn } from '@/components/motion/SpringIn';
import { useAuth } from '@/contexts/AuthContext';
import { changeMyPassword, fetchMyGroup, portalUpdateProfile } from '@/services/portal';
import type { PortalGroup } from '@/types/portal';

/** 账户设置：修改昵称、修改密码、查看分组资费 */
export default function PortalSettings() {
  const { relayProfile, refreshRelayProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  const [group, setGroup] = useState<PortalGroup | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(true);

  useEffect(() => {
    if (relayProfile) setDisplayName(relayProfile.display_name ?? '');
  }, [relayProfile]);

  useEffect(() => {
    fetchMyGroup()
      .then(setGroup)
      .catch((e) => toast.error('获取分组信息失败', { description: e.message }))
      .finally(() => setLoadingGroup(false));
  }, []);

  const handleSaveName = async () => {
    if (!displayName.trim()) {
      toast.error('昵称不能为空');
      return;
    }
    setSavingName(true);
    try {
      await portalUpdateProfile(displayName.trim());
      await refreshRelayProfile();
      toast.success('昵称已更新');
    } catch (e) {
      toast.error('昵称保存失败', { description: (e as Error).message });
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('新密码长度至少 6 位');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的新密码不一致');
      return;
    }
    setSavingPwd(true);
    try {
      await changeMyPassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      toast.success('密码修改成功', { description: '下次登录请使用新密码' });
    } catch (e) {
      toast.error('密码修改失败', { description: (e as Error).message });
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="tech-label text-[9px] text-muted-foreground/60">FIG 7.1 / ACCOUNT SETTINGS</div>
        <h1 className="text-xl md:text-2xl font-semibold mt-1 text-balance">账户设置</h1>
        <p className="text-sm text-muted-foreground mt-1">管理个人资料、登录安全与资费信息</p>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        <SpringIn>
          <Card className="bp-card h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                个人信息
              </CardTitle>
              <CardDescription>用户名为登录标识，不可修改；昵称用于展示</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="s-username" className="tech-label text-[10px] text-muted-foreground">USER ID / 用户名</Label>
                <Input
                  id="s-username"
                  value={relayProfile?.username ?? ''}
                  disabled
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-display" className="tech-label text-[10px] text-muted-foreground">NICKNAME / 昵称</Label>
                <Input
                  id="s-display"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="展示用昵称"
                  disabled={savingName}
                  maxLength={32}
                />
              </div>
              <Button onClick={handleSaveName} disabled={savingName} className="gap-2">
                {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                保存昵称
              </Button>
            </CardContent>
          </Card>
        </SpringIn>

        <SpringIn delay={0.1}>
          <Card className="bp-card h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                修改登录密码
              </CardTitle>
              <CardDescription>修改成功后下次登录生效</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="s-newpwd" className="tech-label text-[10px] text-muted-foreground">NEW PASSWORD / 新密码</Label>
                <Input
                  id="s-newpwd"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="至少 6 位"
                  autoComplete="new-password"
                  disabled={savingPwd}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-confirmpwd" className="tech-label text-[10px] text-muted-foreground">CONFIRM / 确认新密码</Label>
                <Input
                  id="s-confirmpwd"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入新密码"
                  autoComplete="new-password"
                  disabled={savingPwd}
                />
              </div>
              <Button onClick={handleChangePassword} disabled={savingPwd} className="gap-2">
                {savingPwd ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                修改密码
              </Button>
            </CardContent>
          </Card>
        </SpringIn>
      </div>

      {/* 资费信息 */}
      <Card className="bp-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Coins className="w-4 h-4 text-primary" />
            分组与计费倍率
          </CardTitle>
          <CardDescription className="text-pretty">
            最终计费 = (输入Token × 输入单价 + 输出Token × 输出单价) × 模型倍率 × 分组倍率 × 渠道倍率，精度保留 6 位小数
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingGroup ? (
            <Skeleton className="h-24 w-full" />
          ) : group ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="border border-border bg-secondary/30 p-4 rounded-md">
                <div className="tech-label text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  所属分组
                </div>
                <div className="font-medium">{group.display_name || group.name}</div>
                <div className="text-xs text-muted-foreground font-mono mt-1">{group.name}</div>
              </div>
              <div className="border border-border bg-secondary/30 p-4 rounded-md">
                <div className="tech-label text-[10px] text-muted-foreground mb-1.5">分组倍率</div>
                <div className="text-xl font-semibold tabular-nums text-primary">×{group.rate_multiplier}</div>
                <div className="text-xs text-muted-foreground mt-1">乘在模型基础价之上</div>
              </div>
              <div className="border border-border bg-secondary/30 p-4 rounded-md">
                <div className="tech-label text-[10px] text-muted-foreground mb-1.5">模型白名单</div>
                {group.allowed_models.length === 0 ? (
                  <div className="flex items-center gap-1.5 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    全部公开模型
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {group.allowed_models.map((m) => (
                      <Badge key={m} variant="secondary" className="font-mono text-[10px]">{m}</Badge>
                    ))}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1.5">
                  {group.allowed_models.length} 个模型可调用
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">未查询到分组资费信息</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
