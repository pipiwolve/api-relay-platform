import { useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  BadgeCheck,
  BookOpenText,
  Coins,
  Gauge,
  KeyRound,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  PieChart,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { PageTransition } from '@/components/motion/PageTransition';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { name: '运营仪表盘', path: '/admin', icon: LayoutDashboard, code: '01' },
  { name: '用户管理', path: '/admin/users', icon: Users, code: '02' },
  { name: 'API Key 管理', path: '/admin/api-keys', icon: KeyRound, code: '03' },
  { name: '渠道管理', path: '/admin/channels', icon: Layers, code: '04' },
  { name: '模型与分组', path: '/admin/models', icon: PieChart, code: '05' },
  { name: '额度账务', path: '/admin/billing', icon: Coins, code: '06' },
  { name: '消费统计', path: '/admin/stats', icon: Activity, code: '07' },
  { name: 'API 说明', path: '/admin/api-docs', icon: BookOpenText, code: '08' },
  { name: '安全基线', path: '/admin/security', icon: ShieldCheck, code: '09' },
];

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5 px-5 h-16 border-b border-sidebar-border shrink-0">
      <div className="relative flex items-center justify-center w-8 h-8 bg-sidebar-accent rounded-md">
        <Gauge className="w-4 h-4 text-white" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold leading-tight text-white">API 中转站</div>
        <div className="tech-label leading-tight text-sidebar-foreground">RELAY CONTROL / v2.0</div>
      </div>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  return (
    <nav className="flex-1 overflow-y-auto py-3">
      <div className="tech-label px-5 pb-2 text-[9px] text-sidebar-foreground/40">NAVIGATION / 导航</div>
      <ul className="px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <li key={item.path} className="relative">
              <NavLink
                to={item.path}
                end={item.path === '/admin'}
                onClick={onNavigate}
                className={cn(
                  'group flex items-center gap-2.5 min-h-11 px-3 text-sm transition-colors border border-transparent rounded-md',
                  isActive
                    ? 'bg-sidebar-accent text-white border-sidebar-border'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-white'
                )}
              >
                <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-sidebar-foreground/80 group-hover:text-white')} />
                <span className="flex-1 min-w-0 truncate">{item.name}</span>
                <span className={cn('tech-label text-[9px]', isActive ? 'text-white/60' : 'text-sidebar-foreground/50')}>{item.code}</span>
                {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white" />}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SidebarFooter() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="border-t border-sidebar-border p-3">
      <Button
        variant="ghost"
        className="w-full justify-start gap-2 min-h-11 text-sidebar-foreground hover:text-white hover:bg-sidebar-accent"
        onClick={async () => {
          await signOut();
          navigate('/admin/login');
        }}
      >
        <LogOut className="w-4 h-4" />
        <span className="text-sm">退出登录</span>
      </Button>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile } = useAuth();
  const location = useLocation();

  return (
    <div className="flex min-h-screen w-full">
      {/* 桌面侧边栏 */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <BrandMark />
        <NavList />
        <SidebarFooter />
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* 顶部栏 */}
        <header className="sticky top-0 z-40 flex items-center gap-2 h-16 px-4 md:px-6 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          {/* 移动端菜单 */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden shrink-0" aria-label="打开导航菜单">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-sidebar text-sidebar-foreground border-sidebar-border p-0 w-72 max-w-[calc(100%-2rem)]">
              <SheetTitle className="sr-only">导航菜单</SheetTitle>
              <div className="flex flex-col h-full">
                <BrandMark />
                <NavList onNavigate={() => setMobileOpen(false)} />
                <SidebarFooter />
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex-1 min-w-0">
            <div className="tech-label text-[9px] text-muted-foreground/60 hidden md:block">AI TOKEN RELAY CONSOLE</div>
            <div className="text-sm font-medium truncate">大模型 API 中转运营管理平台</div>
          </div>

          <div className="hidden md:flex items-center gap-1.5 shrink-0 text-xs text-muted-foreground border border-border bg-card px-3 py-1.5 rounded-md">
            <BadgeCheck className="w-3.5 h-3.5 text-primary" />
            <span className="tech-label">{profile?.username ?? 'admin'} / ADMIN</span>
          </div>
          <div className="md:hidden flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
            <BadgeCheck className="w-3.5 h-3.5 text-primary" />
            <span className="tech-label">{profile?.username ?? 'admin'}</span>
          </div>
        </header>

        {/* 页面内容（fade-slide 路由转场） */}
        <main className="flex-1 min-w-0 overflow-x-hidden blueprint-grid">
          <PageTransition key={location.pathname} className="p-4 md:p-6 max-w-[1600px] mx-auto w-full">
            {children}
          </PageTransition>
        </main>

        <footer className="border-t border-border px-6 py-3 text-center">
          <span className="tech-label text-[9px] text-muted-foreground/50">SCALE 1:100 · RELAY PLATFORM · © 2026</span>
        </footer>
      </div>
    </div>
  );
}