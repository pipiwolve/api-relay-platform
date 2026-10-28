import { useState } from 'react';
import {
  AlertCircle,
  BookOpenText,
  Check,
  Copy,
  Gauge,
  Terminal,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const ENDPOINT = 'https://www.centerkiller.top/v1/chat/completions';

const CODE_SAMPLES: Record<string, string> = {
  curl: `curl ${ENDPOINT} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $RELAY_API_KEY" \\
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "system", "content": "你是一个专业助手"},
      {"role": "user", "content": "你好，介绍一下你自己"}
    ],
    "stream": true
  }'`,
  python: `import os
from openai import OpenAI

# 指向中转站：只需替换 base_url 与 api_key
client = OpenAI(
    base_url="https://www.centerkiller.top/v1",
    api_key=os.environ["RELAY_API_KEY"],
)

resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "user", "content": "你好，介绍一下你自己"},
    ],
    stream=False,
)

print(resp.choices[0].message.content)
print("用量:", resp.usage.total_tokens, "tokens")`,
  node: `import OpenAI from 'openai';

// 指向中转站：只需替换 baseURL 与 apiKey
const client = new OpenAI({
  baseURL: 'https://www.centerkiller.top/v1',
  apiKey: process.env.RELAY_API_KEY,
});

async function main() {
  const resp = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: '你好，介绍一下你自己' }],
  });

  console.log(resp.choices[0].message.content);
  console.log('用量:', resp.usage?.total_tokens, 'tokens');
}

main();`,
};

const ERROR_CODES = [
  {
    code: '400',
    name: 'BAD_REQUEST',
    desc: '请求体不合法（缺少 model/messages、JSON 解析失败等）',
    action: '检查请求体格式是否符合 OpenAI Chat Completions 规范',
  },
  {
    code: '401',
    name: 'UNAUTHORIZED',
    desc: 'API Key 无效：不存在、已禁用、已删除、已过期或已被轮换',
    action: '在后台核对 Key 状态；轮换后请使用新明文',
  },
  {
    code: '402',
    name: 'INSUFFICIENT_BALANCE',
    desc: '账户余额不足以支付本次请求的预扣额度',
    action: '联系管理员充值后重试',
  },
  {
    code: '403',
    name: 'MODEL_NOT_ALLOWED',
    desc: '请求的模型不在所属分组的白名单内',
    action: '在后台将模型加入分组白名单，或更换模型',
  },
  {
    code: '429',
    name: 'RATE_LIMITED',
    desc: '触发按 Key 维度的 RPM/TPM 频率限制',
    action: '按 Retry-After 头退避重试；必要时申请提升限额',
  },
  {
    code: '503',
    name: 'NO_CHANNEL',
    desc: '目标模型的所有上游渠道均不可用或处于失败冷却期（Fail-Closed）',
    action: '稍后重试；持续出现请联系管理员检查渠道健康',
  },
  {
    code: '504',
    name: 'UPSTREAM_TIMEOUT',
    desc: '上游响应超时；预扣额度已自动全额退还',
    action: '可直接重试；长上下文请求建议调小 max_tokens',
  },
];

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('复制失败，请手动选择复制');
    }
  };
  return (
    <div className="relative border border-border bg-secondary/60">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="tech-label text-[10px] text-muted-foreground">{lang.toUpperCase()}</span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}

export default function ApiDocs() {
  return (
    <div className="space-y-6">
      <div>
        <div className="tech-label text-[9px] text-muted-foreground/60">FIG 8.1 / INTERFACE SPEC</div>
        <h1 className="text-xl md:text-2xl font-semibold mt-1 text-balance">中转 API 端点说明</h1>
        <p className="text-sm text-muted-foreground mt-1">OpenAI 兼容端点接入方式、错误码与限流说明</p>
      </div>

      {/* 端点信息 */}
      <Card className="bp-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" />
            统一端点
          </CardTitle>
          <CardDescription>
            完全兼容 OpenAI Chat Completions 协议；将 SDK 的 base_url 指向中转站、api_key 换成站内签发的 Key 即可
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <div className="flex flex-col md:flex-row md:items-center gap-2 border border-border bg-secondary/40 px-4 py-3">
              <span className="tech-label text-[10px] text-muted-foreground w-24 shrink-0">POST</span>
              <code className="font-mono text-sm break-all">{ENDPOINT}</code>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-2 border border-border bg-secondary/40 px-4 py-3">
              <span className="tech-label text-[10px] text-muted-foreground w-24 shrink-0">鉴权</span>
              <code className="font-mono text-sm break-all">Authorization: Bearer sk-relay-…（站内签发 Key）</code>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-2 border border-border bg-secondary/40 px-4 py-3">
              <span className="tech-label text-[10px] text-muted-foreground w-24 shrink-0">支持模型</span>
              <code className="font-mono text-sm break-all">gpt-4o / claude-3-5-sonnet-latest / gemini-1.5-pro / deepseek-chat 等</code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 调用示例 */}
      <Card className="bp-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpenText className="w-4 h-4 text-primary" />
            调用示例
          </CardTitle>
          <CardDescription>curl / Python / Node.js 三种语言的接入代码</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="curl">
            <TabsList className="mb-4">
              <TabsTrigger value="curl">curl</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="node">Node.js</TabsTrigger>
            </TabsList>
            <TabsContent value="curl">
              <CodeBlock code={CODE_SAMPLES.curl} lang="bash" />
            </TabsContent>
            <TabsContent value="python">
              <CodeBlock code={CODE_SAMPLES.python} lang="python" />
            </TabsContent>
            <TabsContent value="node">
              <CodeBlock code={CODE_SAMPLES.node} lang="javascript" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 错误码 */}
      <Card className="bp-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-warning" />
            错误码说明
          </CardTitle>
          <CardDescription>平台在 OpenAI 兼容错误结构基础上返回以下业务错误码</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            {ERROR_CODES.map((e) => (
              <div key={e.code} className="border border-border bg-secondary/30 p-4 rounded-md">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <Badge
                    className={
                      e.code.startsWith('4')
                        ? 'bg-warning/15 text-warning border-warning/40 font-mono'
                        : 'bg-destructive/15 text-destructive border-destructive/40 font-mono'
                    }
                  >
                    {e.code}
                  </Badge>
                  <span className="tech-label text-[10px] text-muted-foreground">{e.name}</span>
                </div>
                <p className="text-sm mb-1.5 text-pretty">{e.desc}</p>
                <p className="text-xs text-muted-foreground text-pretty">处置建议：{e.action}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 限流说明 */}
      <Card className="bp-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="w-4 h-4 text-primary" />
            频率限制与并发提示
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="border border-border bg-secondary/30 p-4 rounded-md">
              <div className="tech-label text-[10px] text-muted-foreground mb-1.5">RPM 限制</div>
              <p className="text-sm">默认每 Key 60 次/分钟；突发流量平滑排队，超出返回 429 并携带 Retry-After。</p>
            </div>
            <div className="border border-border bg-secondary/30 p-4 rounded-md">
              <div className="tech-label text-[10px] text-muted-foreground mb-1.5">TPM 限制</div>
              <p className="text-sm">默认每 Key 200K Token/分钟；长上下文请求建议分片或调小 max_tokens。</p>
            </div>
            <div className="border border-border bg-secondary/30 p-4 rounded-md">
              <div className="tech-label text-[10px] text-muted-foreground mb-1.5">并发建议</div>
              <p className="text-sm">流式请求保持 SSE 长连接；避免短时间大量建立/断开连接；失败请按指数退避重试。</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
