import { useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  BookOpenText,
  Check,
  Copy,
  Gauge,
  KeyRound,
  ListTree,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SpringIn } from '@/components/motion/SpringIn';

/** 网关接入地址（与管理端 API 说明保持一致） */
const GATEWAY_BASE = 'https://www.centerkiller.top/v1';
const KEY_PLACEHOLDER = '$RELAY_API_KEY';

/** 轻量语法高亮：注释行弱化、Key 占位符与 URL 着色 */
function HighlightLine({ line }: { line: string }) {
  const trimmed = line.trimStart();
  const isComment = trimmed.startsWith('#') || trimmed.startsWith('//');
  if (isComment) {
    return <span className="text-muted-foreground/60 italic">{line}</span>;
  }
  const parts = line.split(/(\$RELAY_API_KEY|https?:\/\/[^\s'"`]+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part === KEY_PLACEHOLDER) {
          return (
            <span key={i} className="text-primary font-semibold">
              {part}
            </span>
          );
        }
        if (/^https?:\/\//.test(part)) {
          return (
            <span key={i} className="text-chart-3">
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('代码已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败', { description: '请手动选择代码复制' });
    }
  };
  return (
    <div className="group relative border border-border bg-[hsl(228_45%_3.5%)] rounded-md overflow-hidden">
      <div className="bp-scanline absolute inset-0 pointer-events-none opacity-60" />
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="absolute top-2 right-2 z-10 h-7 px-2 gap-1 text-[11px] text-muted-foreground hover:text-primary border border-border/60 bg-background/60"
        aria-label="复制代码"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? '已复制' : '复制'}
      </Button>
      <pre className="relative overflow-x-auto p-4 text-[12.5px] leading-relaxed font-mono">
        <code className="whitespace-pre">
          {code.split('\n').map((line, i) => (
            <div key={i} className="flex">
              <span className="select-none text-muted-foreground/30 pr-3 w-6 shrink-0 text-right tabular-nums">{i + 1}</span>
              <span className="min-w-0">
                <HighlightLine line={line} />
              </span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}

const CURL_EXAMPLE = `# 1. 设置你签发的 API Key（从「我的 API Key」页获取）
export RELAY_API_KEY="sk-relay-xxxxxxxxxxxxxxxx"

# 2. 查看当前可用模型列表
curl -s ${GATEWAY_BASE}/models \\
  -H "Authorization: Bearer $RELAY_API_KEY"

# 3. 发起对话补全请求（OpenAI 兼容格式）
curl -s ${GATEWAY_BASE}/chat/completions \\
  -H "Authorization: Bearer $RELAY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "system", "content": "你是一个简洁的助手"},
      {"role": "user", "content": "用一句话介绍 API 中转"}
    ],
    "stream": false
  }'`;

const PYTHON_EXAMPLE = `# Python · openai SDK（推荐）
# pip install openai
from openai import OpenAI

client = OpenAI(
    # 中转网关地址与平台签发的 Key
    base_url="${GATEWAY_BASE}",
    api_key="$RELAY_API_KEY",  # 从「我的 API Key」页获取
)

resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "用一句话介绍 API 中转"}],
)
print(resp.choices[0].message.content)`;

const NODE_EXAMPLE = `// Node.js · openai SDK
// npm install openai
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: '${GATEWAY_BASE}',
  apiKey: process.env.RELAY_API_KEY, // 从「我的 API Key」页获取
});

const resp = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: '用一句话介绍 API 中转' }],
});
console.log(resp.choices[0].message.content);`;

const ERROR_CODES: { code: string; name: string; desc: string; advice: string }[] = [
  { code: '400', name: '参数错误', desc: '请求体不符合 JSON 规范或缺少必填字段', advice: '校验 messages/model 字段与 Content-Type 头' },
  { code: '401', name: '鉴权失败', desc: 'API Key 缺失、格式错误或已失效', advice: '检查 Authorization 头；必要时轮换 Key 并更新配置' },
  { code: '402', name: '余额不足', desc: '账户可用余额或 Key 额度已耗尽', advice: '登录门户查看余额，联系管理员充值后重试' },
  { code: '403', name: '无权限', desc: 'Key 被禁用，或目标模型不在所在分组白名单', advice: '在「我的 API Key」检查状态；查看分组可用模型' },
  { code: '404', name: '资源不存在', desc: '模型名错误或接口路径拼写错误', advice: '先调用 GET /models 获取可用模型列表' },
  { code: '429', name: '触发限流', desc: '超过分组 RPM/TPM 限额', advice: '按指数退避重试（1s→2s→4s），并降低并发' },
  { code: '503', name: '暂不可用', desc: '上游渠道无响应或全部路由失败', advice: '稍后重试；持续出现请联系平台管理员' },
];

function SectionTitle({ icon: Icon, title, code }: { icon: React.ComponentType<{ className?: string }>; title: string; code: string }) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <Icon className="w-4 h-4 text-primary" />
      <h2 className="text-base font-semibold">{title}</h2>
      <span className="tech-label ml-auto text-[9px] text-muted-foreground/50">{code}</span>
    </div>
  );
}

/** 客户端调用文档：curl/Python/Node 示例、错误码、限流说明、接入校验建议 */
export default function PortalDocs() {
  return (
    <div className="space-y-6">
      <div>
        <div className="tech-label text-[9px] text-muted-foreground/60">FIG 6.1 / INTEGRATION GUIDE</div>
        <h1 className="text-xl md:text-2xl font-semibold mt-1 text-balance">调用文档</h1>
        <p className="text-sm text-muted-foreground mt-1">面向接入方的 API 调用说明、错误码与限流规则</p>
      </div>

      {/* 接入概览 */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {[
          { icon: Terminal, label: '接入端点', value: GATEWAY_BASE, hint: 'OpenAI 兼容协议' },
          { icon: KeyRound, label: '鉴权方式', value: 'Bearer Token', hint: 'Authorization 请求头携带 Key' },
          { icon: ListTree, label: '兼容范围', value: '/chat/completions', hint: '支持流式与非流式' },
        ].map((item) => (
          <Card key={item.label} className="bp-card bp-hover-lift">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <item.icon className="w-4 h-4 text-primary" />
                <span className="tech-label text-[10px] text-muted-foreground">{item.label}</span>
              </div>
              <div className="font-mono text-sm text-foreground break-all">{item.value}</div>
              <div className="text-xs text-muted-foreground mt-1.5">{item.hint}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 代码示例 */}
      <SpringIn>
        <Card className="bp-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpenText className="w-4 h-4 text-primary" />
              快速接入示例
            </CardTitle>
            <CardDescription className="text-pretty">
              代码中的 <span className="font-mono text-primary">{KEY_PLACEHOLDER}</span> 为 Key 占位符，请替换为你在「我的 API Key」页签发的真实 Key，切勿写入代码仓库。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="curl">
              <TabsList className="mb-3">
                <TabsTrigger value="curl" className="gap-1.5">curl</TabsTrigger>
                <TabsTrigger value="python" className="gap-1.5">Python</TabsTrigger>
                <TabsTrigger value="node" className="gap-1.5">Node.js</TabsTrigger>
              </TabsList>
              <TabsContent value="curl">
                <CodeBlock code={CURL_EXAMPLE} />
              </TabsContent>
              <TabsContent value="python">
                <CodeBlock code={PYTHON_EXAMPLE} />
              </TabsContent>
              <TabsContent value="node">
                <CodeBlock code={NODE_EXAMPLE} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </SpringIn>

      {/* 错误码表 */}
      <Card className="bp-card">
        <CardHeader>
          <SectionTitle icon={AlertTriangle} title="错误码说明" code="TABLE / ERROR CODES" />
          <CardDescription>网关统一以 JSON 返回错误：{`{ "error": { "code": 401, "message": "..." } }`}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full max-w-full overflow-x-auto bg-card">
            <Table className="[&>div]:max-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">状态码</TableHead>
                  <TableHead className="whitespace-nowrap">含义</TableHead>
                  <TableHead className="whitespace-nowrap">触发原因</TableHead>
                  <TableHead className="whitespace-nowrap">处理建议</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ERROR_CODES.map((e) => (
                  <TableRow key={e.code}>
                    <TableCell className="whitespace-nowrap font-mono font-semibold text-primary">{e.code}</TableCell>
                    <TableCell className="whitespace-nowrap">{e.name}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{e.desc}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{e.advice}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 限流与校验 */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <SpringIn>
          <Card className="bp-card h-full">
            <CardHeader>
              <SectionTitle icon={Gauge} title="RPM / TPM 限流规则" code="LIMITS" />
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="space-y-2.5 text-muted-foreground leading-relaxed">
                <li className="flex gap-2">
                  <Badge variant="secondary" className="font-mono shrink-0 h-6">RPM</Badge>
                  <span className="text-pretty">每分钟请求数上限，按分组配置；超限返回 <span className="font-mono text-primary">429</span>。</span>
                </li>
                <li className="flex gap-2">
                  <Badge variant="secondary" className="font-mono shrink-0 h-6">TPM</Badge>
                  <span className="text-pretty">每分钟 Token 总量上限（输入+输出），超限同样返回 <span className="font-mono text-primary">429</span>。</span>
                </li>
                <li className="flex gap-2">
                  <Badge variant="secondary" className="font-mono shrink-0 h-6">退避</Badge>
                  <span className="text-pretty">建议按指数退避重试（1s → 2s → 4s），最多重试 3 次，避免雪崩。</span>
                </li>
                <li className="flex gap-2">
                  <Badge variant="secondary" className="font-mono shrink-0 h-6">并发</Badge>
                  <span className="text-pretty">客户端建议维护连接池并限制并发，流式请求注意及时消费避免超时。</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </SpringIn>

        <SpringIn delay={0.1}>
          <Card className="bp-card h-full">
            <CardHeader>
              <SectionTitle icon={ShieldCheck} title="接入校验建议" code="CHECKLIST" />
            </CardHeader>
            <CardContent className="space-y-3">
              <ol className="space-y-2.5 text-sm text-muted-foreground leading-relaxed list-decimal list-inside">
                <li className="text-pretty">先调用 <span className="font-mono text-foreground">GET /models</span> 确认 Key 有效与可用模型列表。</li>
                <li className="text-pretty">用一个 max_tokens 较小的请求验证计费链路，随后在「消费明细」核对流水。</li>
                <li className="text-pretty">生产环境将 Key 存于环境变量或密钥管理服务，严禁硬编码。</li>
                <li className="text-pretty">对 401/403 配置告警：Key 失效或被禁用时及时轮换。</li>
                <li className="text-pretty">余额低于安全水位时提前联系管理员充值，避免 402 中断业务。</li>
              </ol>
              <div className="border border-primary/30 bg-primary/5 px-3 py-2.5 rounded-md mt-1">
                <p className="text-xs text-muted-foreground leading-relaxed text-pretty">
                  <KeyRound className="w-3.5 h-3.5 inline-block mr-1 text-primary" />
                  Key 明文仅在签发/轮换时展示一次，平台仅存储 SHA-256 摘要，遗失只能轮换重发。
                </p>
              </div>
            </CardContent>
          </Card>
        </SpringIn>
      </div>
    </div>
  );
}
