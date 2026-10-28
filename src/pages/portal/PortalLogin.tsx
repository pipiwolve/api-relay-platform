import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, LogIn, Lock, Terminal, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { SpringIn } from '@/components/motion/SpringIn';

/** 客户端（接入方）登录页：/login */
export default function PortalLogin() {
  const { user, identity, loading, signInClient, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? '/portal';

  // 存在会话但身份未建档（非本平台账号）→ 清理会话并提示重新注册
  useEffect(() => {
    if (!loading && user && !identity) {
      signOut();
      setError('当前账号未开通接入门户，请先注册');
    }
  }, [loading, user, identity, signOut]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError('请先阅读并同意《用户协议》与《隐私政策》');
      return;
    }
    if (!username.trim() || !password) {
      setError('请输入用户名与密码');
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: err } = await signInClient(username.trim(), password);
    setSubmitting(false);
    if (err) {
      setError(`登录失败：${err.message}`);
      return;
    }
    navigate(from, { replace: true });
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden blueprint-grid p-4">
      <div className="absolute inset-0 hero-glow pointer-events-none" />
      <div className="absolute top-4 left-6 tech-label text-[9px] text-muted-foreground/40">FIG 2.0 / CLIENT AUTH</div>
      <div className="absolute top-4 right-6 tech-label text-[9px] text-muted-foreground/40">AI TOKEN RELAY</div>
      <div className="absolute bottom-4 left-6 tech-label text-[9px] text-muted-foreground/40">REV 2026-10</div>
      <div className="absolute bottom-4 right-6 tech-label text-[9px] text-muted-foreground/40">PORTAL GATE</div>

      <div className="relative z-10 w-full max-w-md">
        <SpringIn>
          <div className="bp-card p-8 md:p-10">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="relative flex items-center justify-center w-14 h-14 border border-primary/60 bg-primary/10 rounded-xl mb-4">
                <Terminal className="w-7 h-7 text-primary" />
                <span className="absolute -top-px -left-px w-2 h-2 border-t border-l border-accent" />
                <span className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-accent" />
              </div>
              <h1 className="text-xl font-semibold text-balance">接入方门户</h1>
              <p className="tech-label mt-2 text-[10px] text-muted-foreground">API RELAY · CLIENT PORTAL</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="p-username" className="tech-label text-[10px] text-muted-foreground">
                  USER ID / 用户名
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    id="p-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="your_name"
                    autoComplete="username"
                    className="pl-9"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="p-password" className="tech-label text-[10px] text-muted-foreground">
                  ACCESS KEY / 密码
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    id="p-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
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
                  id="p-agreement"
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(v === true)}
                  className="mt-0.5"
                  disabled={submitting}
                />
                <label htmlFor="p-agreement" className="text-xs leading-relaxed text-muted-foreground">
                  我已阅读并同意
                  <span className="text-primary">《用户协议》</span>与
                  <span className="text-primary">《隐私政策》</span>
                </label>
              </div>

              <Button type="submit" className="w-full min-h-11 gap-2" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                {submitting ? '登录中…' : '登录门户'}
              </Button>
            </form>

            <div className="mt-5 text-center">
              <span className="text-xs text-muted-foreground">还没有账号？</span>
              <Link to="/register" className="text-xs text-primary hover:underline ml-1">
                立即注册
              </Link>
            </div>
          </div>
        </SpringIn>

        <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回平台入口
          </Link>
          <span className="text-muted-foreground/30 text-xs">|</span>
          <Link to="/admin/login" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            管理员入口
          </Link>
        </div>
      </div>
    </div>
  );
}
