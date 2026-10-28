# API 中转站 - AI Token Relay Platform

大模型 API 中转分发与运营管理平台，包含「管理端」与「客户端自助门户」双端系统。

## 功能特性

### 管理端 (/admin)
- **运营仪表盘**：全站今日请求量、Token 消耗、消费金额、成功率、在线渠道数
- **用户管理**：下游租户账号创建、分组归属、额度充值/扣减、状态管理
- **API Key 管理**：全站 Key 签发、轮换、启停、删除（仅存 SHA-256 摘要）
- **渠道管理**：上游渠道配置（OpenAI/Anthropic/Gemini/DeepSeek/自定义）、优先级/权重调度、失败冷却
- **模型与分组**：模型清单维护、别名映射、分组倍率与模型白名单
- **额度账务**：消费流水审计、余额总览、价格版本记录
- **消费统计**：按模型/渠道/用户多维度的图表分析
- **安全基线**：安全检查清单与开源中转引擎部署指引

### 客户端门户 (/portal)
- **自助注册/登录**：注册即发放 ¥10 初始体验额度
- **仪表盘**：个人余额、今日/近7日消耗、分组信息与可用模型
- **我的 API Key**：个人 Key 签发、轮换、启停、删除
- **消费明细**：按时间/模型/渠道筛选的个人流水
- **调用文档**：curl/Python/Node.js 代码示例、错误码说明、限流规则
- **账户设置**：昵称修改、密码修改、资费信息查看

## 技术栈

- **前端**：React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **后端**：Supabase (PostgreSQL + Auth + RLS)
- **图表**：Recharts
- **动效**：Motion (Framer Motion)
- **路由**：React Router v6

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd app-ey1lbwjv6yo1-source
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

创建 `.env` 文件：

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. 数据库初始化

在 Supabase SQL Editor 中依次执行以下迁移文件：

1. `supabase/migrations/190_init_relay_platform_schema.sql` - 基础表结构 + RLS + 种子数据
2. `supabase/migrations/214_relay_platform_rpc_functions.sql` - RPC 函数（余额调整、健康检查、统计）
3. `supabase/migrations/363_portal_auth_and_rls.sql` - 客户端门户认证与 RLS

### 5. 创建管理员账号

```bash
node tasks/create-admin.mjs <your-password>
```

然后在 Supabase 中将该账号的 `profiles.role` 设置为 `admin`：

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'admin@miaoda.com';
```

### 6. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 构建部署

```bash
npm run build
```

构建产物在 `dist/` 目录，可部署到任意静态托管服务（Vercel、Netlify、Cloudflare Pages 等）。

## 项目结构

```
├── src/
│   ├── components/
│   │   ├── ui/           # shadcn/ui 组件
│   │   ├── layouts/      # 管理端/门户端布局
│   │   ├── common/       # 通用组件（路由守卫等）
│   │   └── motion/       # 动效组件（SpringIn/PageTransition/CountUp）
│   ├── contexts/
│   │   └── AuthContext.tsx  # 双身份认证上下文
│   ├── pages/
│   │   ├── portal/       # 客户端门户页面
│   │   └── ...           # 管理端页面
│   ├── services/
│   │   ├── api.ts        # 管理端 API
│   │   └── portal.ts     # 客户端门户 API
│   ├── db/
│   │   └── supabase.ts   # Supabase 客户端
│   ├── types/            # TypeScript 类型定义
│   ├── lib/
│   │   └── utils.ts      # 工具函数
│   ├── App.tsx           # 应用入口组件
│   ├── main.tsx          # React 入口
│   ├── routes.tsx        # 路由配置
│   └── index.css         # 全局样式
├── supabase/
│   └── migrations/       # 数据库迁移文件
├── tasks/
│   └── create-admin.mjs  # 管理员创建脚本
├── docs/
│   └── prd.md            # 产品需求文档
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## 核心业务规则

### 计费公式
```
总消费金额 = (输入Token × 输入单价 + 输出Token × 输出单价) × 模型倍率 × 分组倍率 × 渠道倍率
```
精度保留至小数点后 6 位。

### 请求中转流程
1. **认 Key**：校验 Key 有效性、状态、过期时间
2. **额度预扣**：按预估 Token 量预扣（余额不足返回 402）
3. **渠道选择**：按分组白名单筛选 → 排除冷却渠道 → 优先级 + 权重轮询
4. **换 Key 转发**：替换为上游 Key，转换模型别名
5. **结算记账**：成功按实际用量结算；失败全额退还预扣额度

### 安全设计
- API Key 仅存 SHA-256 摘要，明文仅签发时展示一次
- 客户端用户仅能访问本人数据（RLS 强制隔离）
- 上游渠道密钥加密存储
- 日志脱敏（不记录 Authorization 与完整 prompt/response）
- Fail-Closed：所有渠道不可用时返回 503 而非透传

## 开源中转引擎对接

本平台管理面可与以下开源中转引擎配合使用：

| 引擎 | 特点 | 推荐场景 |
|------|------|----------|
| [new-api](https://github.com/Calcium-Ion/new-api) | 功能最全，社区活跃 | 生产环境首选 |
| [one-api](https://github.com/songquanpeng/one-api) | 经典稳定，生态成熟 | 小规模部署 |
| [one-hub](https://github.com/MartialBE/one-hub) | 轻量现代，单二进制 | 个人/小团队 |

## 许可证

MIT License

## 贡献指南

欢迎提交 Issue 和 Pull Request。

## 联系方式

如有问题请通过以下方式联系：
- 提交 GitHub Issue
- 发送邮件至 support@example.com
