# PermissionGuard - AVE API Integration

## 项目概述

PermissionGuard 是一个基于 AVE API 构建的链上合约管理员权限风险监控产品。我们通过 AVE API 获取代币数据、风险评分和安全分析，结合 AI 源码分析，为用户提供可读性强的合约权限审计报告。

---

## 为什么选择 AVE API

AVE API 为我们提供了三个核心能力，这些是构建 PermissionGuard 的基础：

1. **实时风险数据** - AVE 提供的合约风险评分和安全指标
2. **多链支持** - 统一接口访问 7+ 条主流 EVM 链
3. **丰富的安全指标** - 20+ 项具体的安全检测指标

---

## 我们如何使用 AVE API

### 1. 代币搜索与发现 (Token Search)

**使用场景：** 用户输入关键词查找代币

**AVE 端点：** `GET /tokens?keyword={keyword}`

**实际应用：**
- 用户搜索 "PEPE" → AVE 返回所有链上的 PEPE 代币
- 用户输入合约地址 → AVE 返回匹配的代币信息
- 支持多链结果：Ethereum、BSC、Base、Arbitrum 等

---

### 2. 风险数据获取 (Risk Analysis)

**使用场景：** 获取合约的详细风险指标

**AVE 端点：** `GET /contracts/{tokenId}`

**Token ID 格式：** `{address}-{chain}`（例如：`0x...-eth`）

**我们展示的 AVE 风险指标：**

| AVE 指标 | 展示位置 | 说明 |
|---------|---------|------|
| `risk_score` | 顶部卡片 | 整体风险评分，颜色编码 |
| `buy_tax` / `sell_tax` | 基础信息 | 买卖税费，颜色警示 |
| `holders` | 基础信息 | 持有人总数 |
| `is_honeypot` | AVE 风险分析 | 是否为蜜罐合约 |
| `has_mint_method` | AVE 风险分析 | 铸币权限 |
| `has_black_method` | AVE 风险分析 | 黑名单权限 |
| `transfer_pausable` | AVE 风险分析 | 暂停权限 |
| `is_proxy` | AVE 风险分析 | 是否为代理合约 |
| `selfdestruct` | AVE 风险分析 | 自毁功能 |
| `owner_change_balance` | AVE 风险分析 | 余额修改权限 |
| `hidden_owner` | AVE 风险分析 | 隐藏所有者检测 |
| `pair_lock_percent` | AVE 风险分析 | 流动性锁定百分比 |
| `owner` | AVE 风险分析 | 合约所有者地址 |
| `creator_address` | AVE 风险分析 | 合约创建者地址 |

**风险评分映射：**
```
AVE Score (0-100)  →  显示颜色
─────────────────────────────
0-10    →  绿色 (Safe)
10-30   →  蓝色 (Low Risk)
30-50   →  黄色 (Caution)
50-80   →  橙色 (High Risk)
80-100  →  红色 (Dangerous)
```

---

### 3. 代币元数据获取 (Token Metadata)

**AVE 端点：** `GET /tokens/{tokenId}`

**我们展示的 AVE 代币数据：**

| AVE 指标 | 展示位置 |
|---------|---------|
| `market_cap` | 基础信息卡片 |
| `current_price_usd` | AVE 风险分析区域 |
| `fdv` (完全稀释估值) | AVE 风险分析区域 |

---

### 4. 数据来源标识

为了区分 AVE API 提供的数据和 AI 分析结果，我们在界面中明确标注：

**AVE 数据区域：**
- 标题： "AVE Risk Analysis"
- 展示：20+ 项 AVE API 的原始检测指标
- 说明： "Data source: AVE API - Real-time contract risk analysis"

**AI 分析区域：**
- 标题： "Admin Permission Analysis"
- 展示：基于源码的深度分析
- 说明：AI 分析的权限类型和漏洞

---

### 5. 链配置获取

**AVE 端点：** `GET /supported_chains`

**实现方式：**
```typescript
// src/app/api/chains/route.ts
export async function GET() {
  const res = await fetch(`${AVE_API_BASE}/supported_chains`, {
    headers: { "X-API-KEY": apiKey },
    next: { revalidate: 3600 },  // 缓存 1 小时
  });
  return NextResponse.json(data);
}
```

**支持的链：**
- Ethereum (eth)
- BSC (bsc)
- Base (base)
- Arbitrum (arbitrum)
- Polygon (polygon)
- Optimism (optimism)
- Avalanche (avalanche)

---

## 技术架构图

```
用户界面 (Next.js)
    ↓
┌───────────────────────────────────────┐
│         PermissionGuard              │
│                                      │
│  ┌──────────┐    ┌─────────────────┐ │
│  │关键词搜索│    │ 直接地址查询     │ │
│  └────┬─────┘    └────────┬────────┘ │
│       │                   │          │
│       └───────────┬───────┘          │
│                   ↓                  │
└───────────────────┼──────────────────┘
                    ↓
        ┌───────────────────────┐
        │   并行数据获取         │
        └───┬───────────────┬───┘
            │               │
    ┌───────▼──────┐  ┌────▼─────┐
    │  AVE API     │  │Etherscan │
    │              │  │   API    │
    │/tokens       │  │          │
    │/contracts    │  │ 源码获取 │
    │/tokens/meta  │  └────┬─────┘
    └──────┬───────┘       │
           │               │
           └───────┬───────┘
                   ↓
        ┌──────────────────────┐
        │   数据处理与展示      │
        └──────────────────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
┌───▼────┐    ┌───▼─────────┐  ┌─▼──────────┐
│AVE 原始│    │AI 源码分析    │  │综合展示    │
│数据展示 │    │(Claude)      │  │          │
│        │    │              │  │• 风险卡片 │
│• 20+   │    │• 权限检测    │  │• 统一视图 │
│  指标  │    │• 漏洞分析    │  │• 颜色编码 │
│• 实时  │    │• 建议生成    │  │          │
│  数据  │    │              │  │          │
└────────┘    └──────────────┘  └────────────┘
```

**数据流说明：**

1. **AVE API 提供的数据**（直接展示）
   - 风险评分（0-100）
   - 税费数据
   - 20+ 项安全检测指标
   - 市场数据（市值、价格等）

2. **Etherscan + Claude 分析**（补充展示）
   - 源码深度分析
   - 管理员权限解读
   - 漏洞检测
   - 风险建议

3. **两者结合**
   - AVE 提供快速、准确的实时数据
   - AI 提供深度的源码级分析
   - 两者互补，提供全面的风险评估

---

## 实际应用案例

### 案例 1：关键词搜索流程

```
1. 用户输入 "PEPE"
   ↓
2. 调用 AVE /tokens?keyword=PEPE
   ↓
3. 返回多个链上的 PEPE 代币
   ↓
4. 用户选择 Ethereum 上的 PEPE
   ↓
5. 并行调用：
   - AVE /contracts/{address}-eth → 风险数据
   - AVE /tokens/{address}-eth → 元数据
   - Etherscan API → 源码
   ↓
6. 展示完整的风险报告
```

### 案例 2：直接地址查询流程

```
1. 用户输入合约地址: 0x6982508145454Ce325dDbE47a25d4ec3d2311933
   ↓
2. 选择链: Ethereum
   ↓
3. 直接调用 AVE API 获取风险数据
   ↓
4. 调用 Etherscan 获取源码
   ↓
5. AI 分析源码
   ↓
6. 展示完整的权限审计报告
```

---

## AVE API 在我们的核心价值主张中的作用

### 1. **实时风险评分**
AVE 的 `risk_score` 为我们提供了即时的合约安全评估，这是用户最关心的第一指标。

### 2. **细粒度的安全检测**
AVE 提供的 20+ 项具体指标让我们能够：
- 精确识别风险来源
- 提供详细的风险解释
- 帮助用户理解具体威胁

### 3. **多链统一接口**
AVE 的统一 API 让我们能够：
- 一次集成，支持多链
- 简化后端架构
- 快速扩展到新链

### 4. **可信的数据源**
AVE 作为专业的链上数据分析平台，为我们提供了：
- 准确的数据
- 及时的更新
- 可靠的服务

---

## 性能优化

### 并行请求
```typescript
// 同时请求多个 AVE 端点以减少延迟
const [riskRes, tokenRes, holdersRes] = await Promise.allSettled([
  fetch(`${AVE_API_BASE}/contracts/${tokenId}`, { headers }),
  fetch(`${AVE_API_BASE}/tokens/${tokenId}`, { headers }),
  fetch(`${AVE_API_BASE}/tokens/top100/${tokenId}`, { headers }),
]);
```

### 错误容错
```typescript
// 使用 Promise.allSettled 确保单个失败不影响整体
async function unwrap(r: PromiseSettledResult<Response>) {
  if (r.status !== "fulfilled") return null;  // 失败返回 null
  return json?.status === 1 ? json.data : null;
}
```

### 缓存策略
- 链列表：缓存 1 小时（很少变化）
- 风险数据：按需获取（实时性要求高）
- AI 分析：Vercel Blob 缓存（减少成本）

---

## 未来计划：更深入的 AVE 集成

### 1. 实时监控
使用 AVE 的监控能力追踪合约权限变化：
- 所有权转移
- 角色授予/撤销
- 实现升级
- 参数修改

### 2. 告警系统
集成 AVE 的告警功能：
- 权限变化通知
- 风险评分突变
- 可疑交易检测

### 3. 协议聚合
利用 AVE 的协议追踪能力：
- 多合约统一视图
- 协议级别风险评估
- 关联合约分析

---

## 环境配置

```env
# 必需的 AVE API 配置
AVE_API_KEY=ave_prod_xxxxx

# 可选但推荐的配置
ETHERSCAN_API_KEY=etherscan_xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

---

## 数据示例

### 用户界面布局

```
┌────────────────────────────────────────────────────────┐
│ PEPE (PEPE)                                            │
│ 0x6982...1193                                          │
│ Ethereum                                               │
│                                                        │
│ AI Risk Score: 25     CAUTION    │  AVE Score: 15     │
│                                                        │
│ Market Cap: $3,500,000,000    Holders: 285,431        │
│ Buy Tax: 0% (绿色)            Sell Tax: 0% (绿色)      │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ AVE RISK ANALYSIS                                      │
│ ←─ AVE API 原始数据                                    │
│                                                        │
│ Owner Address:      0x8a35...                         │
│ Creator Address:    0x96c5...                         │
│ Is Honeypot:        NO ✓                              │
│ Mint Authority:     NO ✓                              │
│ Blacklist Method:   NO ✓                              │
│ Can Pause:          NO ✓                              │
│ Is Proxy:           YES ⚠                             │
│ Self-Destruct:      NO ✓                              │
│ Owner Change Bal:   NO ✓                              │
│ Hidden Owner:       NONE ✓                            │
│ Liquidity Lock:     95%                               │
│ Price (USD):        $0.00001234                       │
│ FDV:                $3,200,000,000                    │
│                                                        │
│ Data source: AVE API - Real-time contract risk analysis│
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ ADMIN PERMISSION ANALYSIS                              │
│ ←─ AI 源码分析 (Claude + Etherscan)                    │
│                                                        │
│ Overview: PEPE is an ERC20 token...                   │
│                                                        │
│ ✓ Mint Authority: SAFE                                │
│ ✓ Freeze Authority: SAFE                              │
│ ⚠ Upgrade Authority: YES - Proxy admin can upgrade   │
│ ✓ Fund Sweep: SAFE                                    │
│                                                        │
│ Controller: Proxy Contract                            │
│ Type: Ethereum Proxy                                  │
│ Address: 0x8a35...                                    │
└────────────────────────────────────────────────────────┘
```

### AVE API 返回的原始数据
```json
{
  "status": 1,
  "data": {
    "risk_score": 15,
    "buy_tax": 0,
    "sell_tax": 0,
    "has_mint_method": 0,
    "has_black_method": 0,
    "transfer_pausable": "0",
    "is_proxy": "1",
    "selfdestruct": "0",
    "owner_change_balance": "0",
    "hidden_owner": "0",
    "holders": 285431,
    "pair_lock_percent": 95,
    "owner": "0x8a35...",
    "creator_address": "0x96c5...",
    "is_honeypot": 0
  }
}
```

---

## 总结

AVE API 是 PermissionGuard 的核心数据源，与 AI 分析形成互补：

### AVE API 提供的能力
1. ✅ **实时风险评分** - 即时的 0-100 风险评分
2. ✅ **20+ 项安全指标** - 涵盖蜜罐、税费、权限等
3. ✅ **市场数据** - 市值、价格、持有人数
4. ✅ **多链支持** - 统一接口访问 7+ 条 EVM 链
5. ✅ **快速响应** - 无需等待链上数据同步

### AI 分析提供的能力
1. ✅ **源码深度分析** - 理解合约逻辑
2. ✅ **权限语义解读** - 将技术代码转为可读说明
3. ✅ **漏洞检测** - 发现潜在安全风险
4. ✅ **风险建议** - 提供操作建议

### 两者结合的价值
- **AVE 提供快速准确的实时数据** - 用户第一时间看到风险概况
- **AI 提供深度的源码级分析** - 帮助用户理解具体风险
- **双重验证** - AVE 和 AI 结果互相印证
- **全面覆盖** - 既有关键指标，又有深度分析

通过 AVE API，我们能够在黑客松期间快速构建出一个功能完整、数据准确的合约权限审计产品。

---