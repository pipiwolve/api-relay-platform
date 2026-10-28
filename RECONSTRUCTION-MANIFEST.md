# 源码重组说明（RECONSTRUCTION-MANIFEST）

- **来源**：秒哒应用 app-ey1lbwjv6yo1「API中转管理平台」对话轨迹全量重组（412 个事件，eventId 6–654，对应 v7）
- **口径**：同一文件多次写入时仅保留最新版本（用户确认）
- **重组时间**：2026-10-28

## 重组文件（37 个）

| 文件 | 大小(字符) | 版本事件 |
|---|---|---|
| `docs/prd.md` | 6771 | e132 file_write_action 全量写入 4459 字符; e290 file_write_action 全量写入 6771 字符 |
| `src/App.tsx` | 953 | e216 file_add_action 全量写入 953 字符 |
| `src/components/common/RouteGuard.tsx` | 2070 | e384 cmd heredoc(>) 全量写入 2070 字符 |
| `src/components/layouts/AdminLayout.tsx` | 6923 | e220 file_add_action 全量写入 6788 字符; e386 cmd heredoc(>) 全量写入 7068 字符; e555 str_replace 应用 (-461/+396); e556 str_replace 应用 (-919/+858); e557 str_replace 应用 (-139/+120) |
| `src/components/layouts/PortalLayout.tsx` | 7079 | e402 file_add_action 全量写入 7222 字符; e558 str_replace 应用 (-462/+397); e559 str_replace 应用 (-919/+858); e560 str_replace 应用 (-139/+120); e562 sed -i 1 表达式，命中 2 行 |
| `src/components/motion/CountUp.tsx` | 1374 | e370 file_add_action 全量写入 1275 字符; e388 str_replace 应用 (-108/+207) |
| `src/components/motion/PageTransition.tsx` | 728 | e371 file_add_action 全量写入 728 字符 |
| `src/components/motion/SpringIn.tsx` | 816 | e372 file_add_action 全量写入 816 字符 |
| `src/contexts/AuthContext.tsx` | 6186 | e382 cmd heredoc(>) 全量写入 6186 字符 |
| `src/index.css` | 15987 | e381 cmd heredoc(>) 全量写入 8835 字符; e528 file_add_action 全量写入 12248 字符; e537 file_add_action 全量写入 15422 字符; e575 str_replace 应用 (-638/+696); e576 str_replace 应用 (-121/+232); e612 str_replace 应用 (-2079/+337); e613 str_replace 应用 (-52/+2167); e640 str_replace 应用 (-525/+525); e641 str_replace 应用 (-28/+37); e642 str_replace 应用 (-57/+71) |
| `src/pages/ApiDocs.tsx` | 9593 | e241 file_add_action 全量写入 9564 字符; e450 sed -i 1 表达式，命中 3 行; e562 sed -i 1 表达式，命中 4 行 |
| `src/pages/ApiKeys.tsx` | 19712 | e228 file_add_action 全量写入 19712 字符 |
| `src/pages/Billing.tsx` | 22383 | e237 file_add_action 全量写入 22382 字符; e250 str_replace 应用 (-101/+102) |
| `src/pages/Channels.tsx` | 26282 | e231 file_add_action 全量写入 26282 字符 |
| `src/pages/Dashboard.tsx` | 8354 | e224 file_add_action 全量写入 7519 字符; e387 cmd heredoc(>) 全量写入 8354 字符 |
| `src/pages/Landing.tsx` | 4277 | e389 file_add_action 全量写入 4272 字符; e562 sed -i 1 表达式，命中 1 行; e571 sed -i 1 表达式，命中 2 行 |
| `src/pages/Login.tsx` | 6568 | e221 file_add_action 全量写入 5692 字符; e385 cmd heredoc(>) 全量写入 6568 字符 |
| `src/pages/ModelsGroups.tsx` | 32187 | e234 file_add_action 全量写入 32174 字符; e236 str_replace 应用 (-256/+269) |
| `src/pages/RelayUsers.tsx` | 20370 | e225 file_add_action 全量写入 20370 字符 |
| `src/pages/Security.tsx` | 10769 | e244 file_add_action 全量写入 10769 字符 |
| `src/pages/UsageStats.tsx` | 15606 | e240 file_add_action 全量写入 15584 字符; e561 str_replace 应用 (-502/+524) |
| `src/pages/portal/MyKeys.tsx` | 17561 | e419 file_add_action 全量写入 17561 字符 |
| `src/pages/portal/MyLogs.tsx` | 12428 | e424 file_add_action 全量写入 12428 字符 |
| `src/pages/portal/PortalDashboard.tsx` | 11657 | e403 file_add_action 全量写入 11659 字符; e428 sed -i 2 表达式，命中 2 行 |
| `src/pages/portal/PortalDocs.tsx` | 12941 | e415 file_add_action 全量写入 12941 字符; e428 sed -i 1 表达式，命中 1 行; e450 sed -i 1 表达式，命中 1 行; e571 sed -i 1 表达式，命中 5 行 |
| `src/pages/portal/PortalLogin.tsx` | 6925 | e400 file_add_action 全量写入 6925 字符 |
| `src/pages/portal/PortalRegister.tsx` | 8582 | e401 file_add_action 全量写入 8582 字符 |
| `src/pages/portal/PortalSettings.tsx` | 8955 | e404 file_add_action 全量写入 8955 字符; e428 sed -i 1 表达式，命中 1 行; e571 sed -i 1 表达式，命中 1 行 |
| `src/routes.tsx` | 4923 | e215 file_add_action 全量写入 2968 字符; e383 cmd heredoc(>) 全量写入 4923 字符 |
| `src/services/api.ts` | 14271 | e210 file_add_action 全量写入 14271 字符 |
| `src/services/portal.ts` | 4474 | e357 file_add_action 全量写入 4390 字符; e423 str_replace 应用 (-129/+213) |
| `src/types/portal.ts` | 902 | e356 file_add_action 全量写入 877 字符; e422 str_replace 应用 (-102/+127) |
| `src/types/types.ts` | 4724 | e208 file_add_action 全量写入 4724 字符 |
| `tasks/create-admin.mjs` | 663 | e197 cmd heredoc(>) 全量写入 663 字符 |
| `supabase/migrations/190_init_relay_platform_schema.sql` | 21543 | e190 supabase_apply_migration 最新版本 |
| `supabase/migrations/363_portal_auth_and_rls.sql` | 7162 | e363 supabase_apply_migration 最新版本 |
| `supabase/migrations/214_relay_platform_rpc_functions.sql` | 3522 | e214 supabase_apply_migration 最新版本 |

## 需手动合并的补丁（2 个脚手架文件，轨迹中仅有编辑事件、无基础内容）

### `src/components/ui/badge.tsx`
- 事件 e541：将以下内容
```
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
```
替换为
```
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
```
### `tailwind.config.js`
- 事件 e538：将以下内容
```
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))'
                },
```
替换为
```
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                    bg: 'hsl(var(--destructive-bg))'
                },
```
- 事件 e539：将以下内容
```
                success: 'hsl(var(--success))',
                warning: 'hsl(var(--warning))',
                info: 'hsl(var(--info))',
```
替换为
```
                success: {
                    DEFAULT: 'hsl(var(--success))',
                    bg: 'hsl(var(--success-bg))'
                },
                warning: {
                    DEFAULT: 'hsl(var(--warning))',
                    bg: 'hsl(var(--warning-bg))'
                },
                info: {
                    DEFAULT: 'hsl(var(--info))',
                    bg: 'hsl(var(--info-bg))'
                },
```
- 事件 e540：将以下内容
```
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)'
            },
```
替换为
```
            borderRadius: {
                xl: 'var(--radius)',
                lg: 'var(--radius)',
                md: 'var(--radius)',
                sm: 'calc(var(--radius) - 4px)'
            },
```

## 排除项

- `tasks/admin-cred.txt`（e197）：管理员凭据文件，按隐私规则不打包

## 轨迹中未保留内容（初始脚手架，生成时创建、无写入事件，cat 观测均为截断标记）

- `index.html`、`src/main.tsx`、`src/db/supabase.ts`、`src/types/index.ts`、`package.json`、`vite.config.ts`、`.rules/`、`.env`
- 如需这些文件，可在秒哒编辑器中查看；`.env` 含平台注入的 Supabase 地址与 anon key
- `tasks/create-admin.mjs` 内含平台 anon key（平台注入，非第三方密钥）

## SQL 迁移尝试历史

- `init_relay_platform_schema`：e184(21604字符) → **e190(21543字符，保留)**，同名为重试修复，后者为最新版本
- `relay_platform_rpc_functions`：e212(3440字符) → **e214(3522字符，保留)**
- `portal_auth_and_rls`：e355(7540字符) → e361(7154字符) → **e363(7162字符，保留，即最终版)**
