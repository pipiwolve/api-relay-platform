import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

// ===== 平台公共页 =====
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const PortalLogin = lazy(() => import('./pages/portal/PortalLogin'));
const PortalRegister = lazy(() => import('./pages/portal/PortalRegister'));

// ===== 管理端 =====
const AdminLayout = lazy(() => import('./components/layouts/AdminLayout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const RelayUsers = lazy(() => import('./pages/RelayUsers'));
const ApiKeys = lazy(() => import('./pages/ApiKeys'));
const Channels = lazy(() => import('./pages/Channels'));
const ModelsGroups = lazy(() => import('./pages/ModelsGroups'));
const Billing = lazy(() => import('./pages/Billing'));
const UsageStats = lazy(() => import('./pages/UsageStats'));
const ApiDocs = lazy(() => import('./pages/ApiDocs'));
const Security = lazy(() => import('./pages/Security'));

// ===== 客户端自助门户 =====
const PortalLayout = lazy(() => import('./components/layouts/PortalLayout'));
const PortalDashboard = lazy(() => import('./pages/portal/PortalDashboard'));
const MyKeys = lazy(() => import('./pages/portal/MyKeys'));
const MyLogs = lazy(() => import('./pages/portal/MyLogs'));
const PortalDocs = lazy(() => import('./pages/portal/PortalDocs'));
const PortalSettings = lazy(() => import('./pages/portal/PortalSettings'));

function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh] w-full">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="tech-label text-[10px] text-muted-foreground/60">LOADING…</span>
      </div>
    </div>
  );
}

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<PageLoading />}>{node}</Suspense>;
}

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  /** 无需登录即可访问 */
  public?: boolean;
}

const adminPage = (node: ReactNode) =>
  withSuspense(<AdminLayout>{node}</AdminLayout>);

const portalPage = (node: ReactNode) =>
  withSuspense(<PortalLayout>{node}</PortalLayout>);

const redirect = (to: string) => withSuspense(<Navigate to={to} replace />);

export const routes: RouteConfig[] = [
  // ===== 平台公共入口 =====
  { name: '平台入口', path: '/', element: withSuspense(<Landing />), public: true },
  { name: '客户端登录', path: '/login', element: withSuspense(<PortalLogin />), public: true },
  { name: '客户端注册', path: '/register', element: withSuspense(<PortalRegister />), public: true },
  { name: '管理员登录', path: '/admin/login', element: withSuspense(<Login />), public: true },

  // ===== 管理端 /admin/*（仅 admin 身份） =====
  { name: '运营仪表盘', path: '/admin', element: adminPage(<Dashboard />) },
  { name: '用户管理', path: '/admin/users', element: adminPage(<RelayUsers />) },
  { name: 'API Key 管理', path: '/admin/api-keys', element: adminPage(<ApiKeys />) },
  { name: '渠道管理', path: '/admin/channels', element: adminPage(<Channels />) },
  { name: '模型与分组', path: '/admin/models', element: adminPage(<ModelsGroups />) },
  { name: '额度账务', path: '/admin/billing', element: adminPage(<Billing />) },
  { name: '消费统计', path: '/admin/stats', element: adminPage(<UsageStats />) },
  { name: 'API 说明', path: '/admin/api-docs', element: adminPage(<ApiDocs />) },
  { name: '安全基线', path: '/admin/security', element: adminPage(<Security />) },

  // ===== 客户端自助门户 /portal/*（仅 client 身份） =====
  { name: '门户首页', path: '/portal', element: portalPage(<PortalDashboard />) },
  { name: '我的 API Key', path: '/portal/keys', element: portalPage(<MyKeys />) },
  { name: '消费明细', path: '/portal/logs', element: portalPage(<MyLogs />) },
  { name: '调用文档', path: '/portal/docs', element: portalPage(<PortalDocs />) },
  { name: '账户设置', path: '/portal/settings', element: portalPage(<PortalSettings />) },

  // ===== 旧路径兼容重定向（保持既有链接/书签可用） =====
  { name: '用户管理', path: '/users', element: redirect('/admin/users'), public: true, visible: false },
  { name: 'API Key 管理', path: '/api-keys', element: redirect('/admin/api-keys'), public: true, visible: false },
  { name: '渠道管理', path: '/channels', element: redirect('/admin/channels'), public: true, visible: false },
  { name: '模型与分组', path: '/models', element: redirect('/admin/models'), public: true, visible: false },
  { name: '额度账务', path: '/billing', element: redirect('/admin/billing'), public: true, visible: false },
  { name: '消费统计', path: '/stats', element: redirect('/admin/stats'), public: true, visible: false },
  { name: 'API 说明', path: '/api-docs', element: redirect('/admin/api-docs'), public: true, visible: false },
  { name: '安全基线', path: '/security', element: redirect('/admin/security'), public: true, visible: false },
];