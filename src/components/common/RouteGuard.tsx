import { useEffect, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/** 无需登录即可访问的路径（平台入口与两端登录/注册页） */
const PUBLIC_ROUTES = ['/', '/login', '/register', '/admin/login', '/403', '/404'];

/**
 * 全局路由守卫（双身份感知）：
 * - 未登录访问受保护路由 → 按区域跳转对应登录页（/admin/* → /admin/login，其余 → /login）
 * - client 身份访问 /admin/* → 重定向 /portal；admin 身份访问 /portal/* → 重定向 /admin
 * - 已登录访问登录/注册/入口页 → 直接前往对应工作台
 */
export function RouteGuard({ children }: { children: ReactNode }) {
  const { user, identity, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    const path = location.pathname;

    // 已登录用户访问入口/登录/注册页 → 前往对应工作台
    if (user && identity && ['/', '/login', '/register', '/admin/login'].includes(path)) {
      navigate(identity === 'admin' ? '/admin' : '/portal', { replace: true });
      return;
    }

    if (PUBLIC_ROUTES.includes(path)) return;

    // 未登录或身份未建档 → 按访问区域跳对应登录页
    if (!user || !identity) {
      const target = path.startsWith('/admin') ? '/admin/login' : '/login';
      if (path !== target) {
        navigate(target, { state: { from: path }, replace: true });
      }
      return;
    }

    // 管理端仅限 admin 身份
    if (path.startsWith('/admin') && identity !== 'admin') {
      navigate('/portal', { replace: true });
      return;
    }

    // 门户仅限 client 身份
    if (path.startsWith('/portal') && identity !== 'client') {
      navigate('/admin', { replace: true });
    }
  }, [user, identity, loading, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="tech-label text-[10px] text-muted-foreground/60">AUTHORIZING…</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}