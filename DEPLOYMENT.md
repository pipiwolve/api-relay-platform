# 部署指南

## 前置要求

- Node.js 18+
- npm 或 pnpm
- Supabase 项目（已创建并获取 URL 和 Anon Key）

## 1. 前端部署

### 本地开发

```bash
npm install
cp .env.example .env
# 编辑 .env 填入你的 Supabase 配置
npm run dev
```

### 生产构建

```bash
npm run build
```

构建产物在 `dist/` 目录。

### Vercel 部署

1. 将代码推送到 GitHub/GitLab/Bitbucket
2. 在 Vercel 中导入项目
3. 配置环境变量：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. 构建命令：`npm run build`
5. 输出目录：`dist`

### Netlify 部署

1. 将代码推送到 Git 仓库
2. 在 Netlify 中连接仓库
3. 构建设置：
   - Build command: `npm run build`
   - Publish directory: `dist`
4. 环境变量：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Cloudflare Pages

```bash
npm install -g wrangler
wrangler pages publish dist
```

## 2. 数据库初始化

在 Supabase Dashboard → SQL Editor 中依次执行：

### 第一步：基础表结构

```bash
# 复制 supabase/migrations/190_init_relay_platform_schema.sql 的内容并执行
```

### 第二步：RPC 函数

```bash
# 复制 supabase/migrations/214_relay_platform_rpc_functions.sql 的内容并执行
```

### 第三步：客户端门户认证

```bash
# 复制 supabase/migrations/363_portal_auth_and_rls.sql 的内容并执行
```

## 3. 管理员账号创建

```bash
node tasks/create-admin.mjs <your-secure-password>
```

然后在 Supabase SQL Editor 中执行：

```sql
UPDATE profiles SET role = 'admin'
WHERE email = 'admin@miaoda.com';
```

## 4. 自定义域名配置

### Vercel

1. 项目设置 → Domains → 添加域名
2. 配置 DNS 记录（A 或 CNAME）

### Netlify

1. Domain settings → Add custom domain
2. 配置 DNS 记录

## 5. HTTPS 强制

在托管平台设置中启用 "Force HTTPS" 或 "HTTPS Only"。

## 6. 环境变量安全

- 永远不要将 `.env` 文件提交到版本控制
- 使用平台提供的环境变量管理功能
- 定期轮换 Supabase Anon Key（如泄露）

## 7. 监控与日志

### Supabase 监控

- Dashboard → Database → 查看慢查询
- Dashboard → Auth → 查看登录日志
- Dashboard → Logs → 查看 API 请求日志

### 前端监控

可集成 Sentry 或 LogRocket：

```bash
npm install @sentry/react
```

## 8. 备份策略

### 数据库备份

Supabase 自动每日备份（免费版保留 7 天）。建议：

1. 启用 Point-in-Time Recovery（付费功能）
2. 定期导出数据：
   ```bash
   supabase db dump -f backup.sql
   ```

### 代码备份

- 使用 Git 进行版本控制
- 定期推送到远程仓库
- 使用 Git 标签标记发布版本

## 9. 安全加固

### 启用 RLS

确保所有表都启用了 Row Level Security：

```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

### 限制 API 访问

在 Supabase 设置中配置 API 限制：

1. Authentication → Settings → 禁用公开注册（如需要）
2. Database → Settings → 限制 API 访问

### 定期更新依赖

```bash
npm audit
npm audit fix
```

## 10. 性能优化

### 前端优化

- 已配置代码分割（vendor/supabase/charts/motion）
- 使用懒加载路由
- 图片使用 WebP 格式

### 数据库优化

- 已为常用查询字段创建索引
- 定期清理旧日志数据：

```sql
-- 删除 90 天前的消费流水
DELETE FROM usage_logs WHERE created_at < now() - interval '90 days';
```

## 11. 故障排查

### 常见问题

**Q: 登录失败，提示 "Missing Supabase environment variables"**

A: 检查 `.env` 文件是否存在且包含正确的 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。

**Q: 数据库查询返回空数据**

A: 检查 RLS 策略是否正确配置，以及用户是否有权限访问该数据。

**Q: 构建失败**

A: 确保 Node.js 版本 >= 18，并尝试删除 `node_modules` 和 `package-lock.json` 后重新安装。

**Q: 图表不显示**

A: 检查浏览器控制台是否有错误，确保 Recharts 正确安装。

## 12. 升级指南

### 更新依赖

```bash
npm update
```

### 数据库迁移

如需修改数据库结构，创建新的迁移文件：

```bash
supabase migration new <migration-name>
```

然后在 `supabase/migrations/` 目录下编辑生成的 SQL 文件。

## 13. 多环境部署

建议设置三个环境：

| 环境 | 用途 | 分支 |
|------|------|------|
| Development | 本地开发 | `dev` |
| Staging | 测试验证 | `staging` |
| Production | 生产环境 | `main` |

每个环境使用不同的 Supabase 项目和域名。
