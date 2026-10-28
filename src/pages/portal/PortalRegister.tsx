import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Gift, Loader2, Lock, Terminal, User, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { SpringIn } from '@/components/motion/SpringIn';

/** 客户端（接入方）自助注册页：/register —— 用户名+密码，注册即建档并发放初始额度 */
export default function PortalRegister() {
  const { signUpClient } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError('请先阅读并同意《用户协议》与《隐私政策》');
      return;
    }
    const name = username.trim();
    if (!/^[A-Za-z0-9_]{3,32}$/.test(name)) {
      setError('用户名需为 3-32 位字母、数字或下划线');
      return;
    }
    if (password.length < 6) {
      setError('密码长度至少 6 位');
      return;
    }
    if (password !== confirm) {
      setError('两次输入的密码不一致');
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: err } = await signUpClient(name, password, displayName.trim() || undefined);
    setSubmitting(false);
    if (err) {
      setError(`注册失败：${err.message}`);
      return;
    }
    toast.success('注册成功，已发放 ¥10.00 初始体验额度', {
      description: '欢迎接入 API 中转站，可在「我的 API Key」页签发调用密钥',
    });
    navigate('/portal', { replace: true });
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden blueprint-grid p-4">
      <div className="absolute inset-0 hero-glow pointer-events-none" />
      <div className="absolute top-4 left-6 tech-label text-[9px] text-muted-foreground/40">FIG 2.1 / SIGN UP</div>
      <div className="absolute top-4 right-6 tech-label text-[9px] text-muted-foreground/40">AI TOKEN RELAY</div>
      <div className="absolute bottom-4 left-6 tech-label text-[9px] text-muted-foreground/40">REV 2026-10</div>
      <div className="absolute bottom-4 right-6 tech-label text-[9px] text-muted-foreground/40">NEW ACCOUNT</div>

      <div className="relative z-10 w-full max-w-md">
        <SpringIn>
          <div className="bp-card p-8 md:p-10">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="relative flex items-center justify-center w-14 h-14 border border-primary/60 bg-primary/10 rounded-xl mb-4">
                <Terminal className="w-7 h-7 text-primary" />
                <span className="absolute -top-px -left-px w-2 h-2 border-t border-l border-accent" />
                <span className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-accent" />
              </div>
              <h1 className="text-xl font-semibold text-balance">注册接入方账号</h1>
              <p className="tech-label mt-2 text-[10px] text-muted-foreground">CREATE RELAY ACCOUNT</p>
            </div>

            {/* 注册福利提示 */}
            <div className="flex items-start gap-2 border border-primary/30 bg-primary/5 px-3 py-2.5 rounded-md mb-5">
              <Gift className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
              <p className="text-xs text-muted-foreground leading-relaxed text-pretty">
                注册即自动开通账号并发放 <span className="text-primary font-semibold">¥10.00</span> 初始体验额度，可用于测试模型调用。
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="r-username" className="tech-label text-[10px] text-muted-foreground">
                  USER ID / 用户名 *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    id="r-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="3-32 位字母 / 数字 / 下划线"
                    autoComplete="username"
                    className="pl-9 font-mono text-sm"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="r-display" className="tech-label text-[10px] text-muted-foreground">
                  NICKNAME / 昵称
                </Label>
                <Input
                  id="r-display"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="选填，展示用昵称"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="r-password" className="tech-label text-[10px] text-muted-foreground">
                  PASSWORD / 密码 *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    id="r-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="至少 6 位"
                    autoComplete="new-password"
                    className="pl-9"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="r-confirm" className="tech-label text-[10px] text-muted-foreground">
                  CONFIRM / 确认密码 *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    id="r-confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="再次输入密码"
                    autoComplete="new-password"
                    className="pl-9"
                    disabled={submitting}
                  />
                </div>
              </div>

              {error && (
                <div className="border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive rounded-md">
                  {error}
                </div>
              )}

              <div className="flex items-start gap-2">
                <Checkbox
                  id="r-agreement"
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(v === true)}
                  className="mt-0.5"
                  disabled={submitting}
                />
                <label htmlFor="r-agreement" className="text-xs leading-relaxed text-muted-foreground">
                  我已阅读并同意
                  <span className="text-primary">《用户协议》</span>与
                  <span className="text-primary">《隐私政策》</span>
                </label>
              </div>

              <Button type="submit" className="w-full min-h-11 gap-2" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {submitting ? '注册中…' : '创建账号并进入门户'}
              </Button>
            </form>

            <div className="mt-5 text-center">
              <span className="text-xs text-muted-foreground">已有账号？</span>
              <Link to="/login" className="text-xs text-primary hover:underline ml-1">
                直接登录
              </Link>
            </div>
          </div>
        </SpringIn>

        <div className="mt-4 flex items-center justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回平台入口
          </Link>
        </div>
      </div>
    </div>
  );
}
