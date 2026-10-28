import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Gauge, KeyRound, Loader2, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { SpringIn } from '@/components/motion/SpringIn';

/** 管理员登录页（/admin/login），与客户端登录页（/login）入口分离 */
export default function Login() {
  const { signInAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? '/admin';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError('请先阅读并同意《用户协议》与《隐私政策》');
      return;
    }
    if (!username.trim() || !password) {
      setError('请输入管理员账号与密码');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await signInAdmin(username.trim(), password);
    setLoading(false);
    if (err) {
      setError(`登录失败：${err.message}`);
      return;
    }
    navigate(from, { replace: true });
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden blueprint-grid p-4">
      {/* 装饰：极光光晕 */}
      <div className="absolute inset-0 hero-glow pointer-events-none" />
      {/* 装饰：四角刻度 */}
      <div className="absolute top-4 left-6 tech-label text-[9px] text-muted-foreground/40">FIG 1.0 / ADMIN AUTH</div>
      <div className="absolute top-4 right-6 tech-label text-[9px] text-muted-foreground/40">SCALE 1:100</div>
      <div className="absolute bottom-4 left-6 tech-label text-[9px] text-muted-foreground/40">REV 2026-10</div>
      <div className="absolute bottom-4 right-6 tech-label text-[9px] text-muted-foreground/40">SHEET A1</div>

      <div className="relative z-10 w-full max-w-md">
        <SpringIn>
          <div className="bp-card p-8 md:p-10">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="relative flex items-center justify-center w-14 h-14 border border-primary/60 bg-primary/10 mb-4 rounded-lg">
                <Gauge className="w-7 h-7 text-primary" />
                <span className="absolute -top-px -left-px w-2 h-2 border-t border-l border-accent" />
                <span className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-accent" />
              </div>
              <h1 className="text-xl font-semibold text-balance">API 中转站管理平台</h1>
              <p className="tech-label mt-2 text-[10px] text-muted-foreground">AI TOKEN RELAY · ADMIN CONSOLE</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="tech-label text-[10px] text-muted-foreground">
                  ADMIN ID / 管理员账号
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    autoComplete="username"
                    className="pl-9"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="tech-label text-[10px] text-muted-foreground">
                  ACCESS KEY / 密码
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    className="pl-9"
                    disabled={loading}
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
                  id="agreement"
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(v === true)}
                  className="mt-0.5"
                  disabled={loading}
                />
                <label htmlFor="agreement" className="text-xs leading-relaxed text-muted-foreground">
                  我已阅读并同意
                  <span className="text-primary">《用户协议》</span>与
                  <span className="text-primary">《隐私政策》</span>
                </label>
              </div>

              <Button type="submit" className="w-full min-h-11 gap-2" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                {loading ? '验证中…' : '进入控制台'}
              </Button>
            </form>
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
          <Link to="/login" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            接入方门户入口
          </Link>
        </div>
        <p className="tech-label mt-2 text-center text-[9px] text-muted-foreground/50">
          MANAGED PLANE ONLY · 业务面请访问 API 网关域名
        </p>
      </div>
    </div>
  );
}