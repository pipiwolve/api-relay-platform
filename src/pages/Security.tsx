import { useEffect, useState } from 'react';
import {
  Boxes,
  CheckCircle2,
  Circle,
  Cloud,
  Lock,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchSecurityBaselines, toggleBaseline } from '@/services/api';
import type { SecurityBaseline } from '@/types/types';

const SEVERITY_META = {
  critical: { label: '关键', cls: 'bg-destructive/15 text-destructive border-destructive/40' },
  high: { label: '高', cls: 'bg-warning/15 text-warning border-warning/40' },
  medium: { label: '中', cls: 'bg-primary/15 text-primary border-primary/40' },
  low: { label: '低', cls: 'bg-muted text-muted-foreground border-border' },
} as const;

const ENGINE_GUIDES = [
  {
    name: 'new-api',
    tag: '推荐 · 功能最全',
    desc: '社区活跃度最高，原生支持渠道优先级/权重、模型映射、分组倍率、按 Token 计费与详细流水，与本平台的业务模型几乎一一对应。',
    env: `# docker-compose 核心配置
services:
  new-api:
    image: calciumion/new-api:latest
    ports: ["3000:3000"]
    environment:
      - SQL_DSN=root:pass@tcp(mysql:3306)/new-api
      - REDIS_CONN_STRING=redis://redis:6379
      - SESSION_SECRET=<随机32字节>
      - TZ=Asia/Shanghai
    volumes: ["./data:/data"]`,
  },
  {
    name: 'one-api',
    tag: '经典 · 稳定',
    desc: '最早的开源中转实现，生态成熟、部署简单；适合渠道数量不大、无需复杂分组倍率的小规模场景。',
    env: `# docker-compose 核心配置
services:
  one-api:
    image: justsong/one-api:latest
    ports: ["3000:3000"]
    environment:
      - SQL_DSN=root:pass@tcp(mysql:3306)/one-api
      - REDIS_CONN_STRING=redis://redis:6379
      - SESSION_SECRET=<随机32字节>
      - TZ=Asia/Shanghai
    volumes: ["./data:/data"]`,
  },
  {
    name: 'one-hub',
    tag: '轻量 · 易维护',
    desc: 'one-api 的轻量化分支，单二进制部署、资源占用低，界面现代；适合个人或小团队自建中转。',
    env: `# docker-compose 核心配置
services:
  one-hub:
    image: mossblack/one-hub:latest
    ports: ["3010:3010"]
    environment:
      - SQL_DSN=root:pass@tcp(mysql:3306)/one-hub
      - TZ=Asia/Shanghai
    volumes: ["./data:/app/data"]`,
  },
];

const DEPLOY_STEPS = [
  {
    title: '① 管理面 / 业务面分离部署',
    desc: '管理后台（new-api/one-hub 的 Web UI）绑定 admin.example.com，仅放行办公网 IP 或 VPN；中转 API 网关绑定 api.example.com，仅暴露 /v1/* 路由，两者使用不同源站端口。',
  },
  {
    title: '② 数据库与密钥存储',
    desc: 'MySQL/PostgreSQL 仅内网可达；渠道上游 Key 依赖引擎自带的加密存储或对接 Vault/KMS；定期备份 SQL_DSN 数据库并演练恢复。',
  },
  {
    title: '③ 网关与 TLS',
    desc: '前置 Nginx/Caddy 终结 TLS 1.2+，开启 HSTS；按 Key 配置 rate limit（limit_req_zone）；业务面与管理面均禁止明文 HTTP。',
  },
  {
    title: '④ 高可用与 Fail-Closed',
    desc: '多实例 + Redis 共享会话与限流计数；渠道配置失败冷却（本平台默认 3 次 / 300 秒）；所有渠道不可用时返回 503 而非透传，保证计费一致性。',
  },
];

export default function Security() {
  const [items, setItems] = useState<SecurityBaseline[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await fetchSecurityBaselines());
    } catch (e) {
      toast.error('加载安全基线失败', { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleToggle = async (item: SecurityBaseline, next: boolean) => {
    setToggling(item.id);
    try {
      await toggleBaseline(item.id, next);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_enabled: next } : i)));
      toast.success(next ? `已启用：「${item.title}」` : `已停用：「${item.title}」`);
    } catch (e) {
      toast.error('状态更新失败', { description: (e as Error).message });
    } finally {
      setToggling(null);
    }
  };

  const enabledCount = items.filter((i) => i.is_enabled).length;
  const grouped = items.reduce<Record<string, SecurityBaseline[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="tech-label text-[9px] text-muted-foreground/60">FIG 9.1 / SECURITY BASELINE</div>
          <h1 className="text-xl md:text-2xl font-semibold mt-1 text-balance">安全与运维基线</h1>
          <p className="text-sm text-muted-foreground mt-1">平台安全检查清单与开源中转引擎部署指引</p>
        </div>
        <div className="border border-border bg-secondary/40 px-4 py-2.5 shrink-0">
          <span className="tech-label text-[10px] text-muted-foreground">CHECKLIST</span>
          <div className="text-sm tabular-nums mt-0.5">
            <span className={enabledCount === items.length ? 'text-success' : 'text-warning'}>
              {enabledCount}
            </span>
            <span className="text-muted-foreground"> / {items.length} 项已启用</span>
          </div>
        </div>
      </div>

      {/* 检查清单 */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([category, list]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2.5">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold">{category}</h2>
                <span className="tech-label text-[9px] text-muted-foreground/60">
                  {list.filter((i) => i.is_enabled).length}/{list.length} ENABLED
                </span>
              </div>
              <div className="space-y-2.5">
                {list.map((item) => {
                  const sev = SEVERITY_META[item.severity];
                  return (
                    <Card key={item.id} className={`bp-card ${item.is_enabled ? '' : 'opacity-75'}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3 flex-col md:flex-row">
                          <div className="flex items-center gap-2 shrink-0 md:pt-0.5">
                            {item.is_enabled ? (
                              <CheckCircle2 className="w-5 h-5 text-success" />
                            ) : (
                              <Circle className="w-5 h-5 text-muted-foreground/50" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{item.title}</span>
                              <Badge className={sev.cls}>{sev.label}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed text-pretty">
                              {item.description}
                            </p>
                            {item.config_guide && (
                              <div className="mt-2.5 border border-primary/25 bg-primary/5 px-3 py-2 flex items-start gap-2">
                                <Terminal className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                <p className="text-xs leading-relaxed text-pretty">
                                  <span className="tech-label text-[9px] text-primary block mb-0.5">CONFIG GUIDE / 配置指引</span>
                                  {item.config_guide}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 md:pt-0.5">
                            <Switch
                              checked={item.is_enabled}
                              disabled={toggling === item.id}
                              onCheckedChange={(v) => handleToggle(item, v)}
                              aria-label={`切换「${item.title}」启用状态`}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 引擎对接建议 */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <Boxes className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">开源中转引擎对接建议</h2>
          <span className="tech-label text-[9px] text-muted-foreground/60">ENGINE INTEGRATION</span>
        </div>
        <div className="grid gap-4 grid-cols-1 @xl:grid-cols-3">
          {ENGINE_GUIDES.map((g) => (
            <Card key={g.name} className="bp-card bp-hover-lift">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="font-mono text-sm">{g.name}</CardTitle>
                  <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">{g.tag}</Badge>
                </div>
                <CardDescription className="text-xs text-pretty">{g.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="overflow-x-auto border border-border bg-secondary/60 p-3 text-[11px] leading-relaxed">
                  <code className="font-mono">{g.env}</code>
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 部署架构 */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <Cloud className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">部署架构建议</h2>
          <span className="tech-label text-[9px] text-muted-foreground/60">DEPLOYMENT</span>
        </div>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {DEPLOY_STEPS.map((s) => (
            <Card key={s.title} className="bp-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{s.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed text-pretty">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2 text-xs text-muted-foreground border border-warning/40 bg-warning/5 p-4">
        <Lock className="w-4 h-4 shrink-0 mt-0.5 text-warning" />
        <p className="text-pretty">
          提示：本页清单为运维基线的管理面配置台账，开关状态仅记录各基线项在当前部署中的启用情况；实际生效需按「配置指引」在中转引擎与网关层完成对应设置。
        </p>
      </div>
    </div>
  );
}
