import { Link } from 'react-router-dom';
import { ArrowRight, Gauge, ShieldCheck, Terminal } from 'lucide-react';
import { SpringIn } from '@/components/motion/SpringIn';

/** 平台入口选择页：客户端接入门户 / 管理控制台 双入口 */
export default function Landing() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden blueprint-grid p-4">
      {/* 装饰：极光光晕 + 四角刻度 */}
      <div className="absolute inset-0 hero-glow pointer-events-none" />
      <div className="absolute top-4 left-6 tech-label text-[9px] text-muted-foreground/40">FIG 0.0 / GATEWAY</div>
      <div className="absolute top-4 right-6 tech-label text-[9px] text-muted-foreground/40">AI TOKEN RELAY</div>
      <div className="absolute bottom-4 left-6 tech-label text-[9px] text-muted-foreground/40">REV 2026-10</div>
      <div className="absolute bottom-4 right-6 tech-label text-[9px] text-muted-foreground/40">HEARTH LIFEOS EDITION</div>

      <div className="relative z-10 w-full max-w-3xl">
        {/* 品牌区 */}
        <SpringIn className="flex flex-col items-center text-center mb-8">
          <div className="relative flex items-center justify-center w-16 h-16 border border-primary/60 bg-primary/10 rounded-xl mb-5">
            <Terminal className="w-8 h-8 text-primary" />
            <span className="absolute -top-px -left-px w-2.5 h-2.5 border-t border-l border-accent" />
            <span className="absolute -bottom-px -right-px w-2.5 h-2.5 border-b border-r border-accent" />
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-balance">API 中转站</h1>
          <p className="tech-label mt-2 text-[11px] mission-shimmer font-semibold">AI TOKEN RELAY PLATFORM</p>
          <p className="text-sm text-muted-foreground mt-3 max-w-md text-pretty">
            大模型 API 中转分发与运营平台 · 统一 Key 签发 · 多渠道路由 · 按 Token 用量精准结算
          </p>
        </SpringIn>

        {/* 双入口卡片 */}
        <div className="grid gap-4 md:grid-cols-2">
          <SpringIn delay={0.12}>
            <Link
              to="/login"
              className="group flex flex-col bp-card bp-hover-lift p-6 h-full"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center justify-center w-11 h-11 border border-primary/50 bg-primary/10 rounded-lg">
                  <Terminal className="w-5 h-5 text-primary" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <div className="tech-label text-[9px] text-muted-foreground/50 mb-1">CLIENT PORTAL / 接入方</div>
              <h2 className="text-base font-semibold mb-2">客户端接入门户</h2>
              <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
                注册账号、管理个人 API Key、查看余额与消费明细、获取调用文档与代码示例。
              </p>
            </Link>
          </SpringIn>

          <SpringIn delay={0.22}>
            <Link
              to="/admin/login"
              className="group flex flex-col bp-card bp-hover-lift p-6 h-full"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center justify-center w-11 h-11 border border-accent/50 bg-accent/10 rounded-lg">
                  <Gauge className="w-5 h-5 text-primary" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <div className="tech-label text-[9px] text-muted-foreground/50 mb-1">ADMIN CONSOLE / 管理员</div>
              <h2 className="text-base font-semibold mb-2">管理控制台</h2>
              <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
                上游渠道配置、用户与分组管理、额度账务、消费统计与安全运维基线管理。
              </p>
            </Link>
          </SpringIn>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-muted-foreground/50">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="tech-label text-[9px]">SECURE BY DESIGN · KEY 仅存 SHA-256 摘要</span>
        </div>
      </div>
    </div>
  );
}
