# OrderStatus — Lab Consumption PWA（骨架）



产品与数据设计见仓库内 [request.md](request.md)、[plan-airtable.md](plan-airtable.md)、[**M1** Base](M1.md)、[**M2** 登录](M2.md)、[**M3** 物料读取](M3.md)、[**M4** 采集 UI](M4.md)、[**M5** 写入消耗](M5.md)。



## 当前能力



- **M2**：Next.js App Router，`jose` 可验证会话、通行码 **hash**、`GET /api/health`、`/api/login` 限速、`/api/logout`、manifest + 图标。**未承诺离线。**

- **M3**：**`GET /api/materials`**（需登录）；**`lib/airtable.ts`** 分页拉 active；**`lib/quantity-defaults.ts`** 归一 **`defaultIncrement`** / **`quickAmounts`**（整数、步进倍数，非倍数 **剔除**）；白名单 **`MaterialDto`**（`group`/`imageUrl`/`quickAmounts[]`，见 **`lib/materials-contract.ts`**）+ **`generatedAt`/`schemaVersion`**。前端 **`hooks/use-materials`**、**`lib/materials-client.ts`**：键 **`consumption:m3-ui-contract:materials`**，`schemaVersion` 不匹配整块丢弃；**失败仍可显示上一轮缓存**。

- **M4**：采集主流程 UI（**Mock 提交**）。路由 **`/`** · **`/pick`** · **`/usage`** · **`/quantity`** · **`/review`**（`/materials` → `/pick`）。草稿 **`DraftConsumption`** 存 **`sessionStorage`**（`consumption:m4:draft`）；最近使用 **`localStorage`**（≤8、prepend、去重）。全程 **无搜索框**、**整数数量**、**§8 清理表**；401 清草稿 + 物料缓存后跳登录。详见 [M4.md](M4.md)。

- **M5**：**`POST /api/consumption`** + **`PATCH /api/consumption/[id]/void`**（Undo）；服务端校验数量步进、UUID 幂等（默认 **30 天** lookup）、**200 统一 success**、voided 重放语义。Review **`ensureClientRequestId`**；401 **`handleSessionExpired`** 清 draft + **`consumption:m5:client-request-id`** / draftKey + materials。详见 [M5.md](M5.md)。

**M5 idempotency:** `clientRequestId` is generated when the user enters the Review step and is reused for all retries of that draft. Any draft mutation before submission regenerates it. The server idempotency lookup is scoped to the last `IDEMPOTENCY_LOOKUP_DAYS` days, defaulting to **30**.



### 环境与口令



```bash

cp .env.example .env.local

```



**始终**：



1. **`SESSION_SECRET`**：至少 **32** 字节随机串，例如  

   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

2. **生产**：**`APP_PASSCODE_HASH`**（bcrypt）：  

   `node -e "const b=require('bcryptjs'); console.log(b.hashSync('YOUR_PLAIN', 12))"`

3. **仅本地**：可暂时 **`APP_PASSCODE`**（在未设 hash、`NODE_ENV` 非 production 时使用）。切勿用于生产。



**M3 起必填（否则 `GET /api/materials` 返回 500，不含密钥）**：



| 变量 | 说明 |

|------|------|

| `AIRTABLE_PAT` | Personal Access Token（仅服务端） |

| `AIRTABLE_BASE_ID` | Base ID |

| `AIRTABLE_MATERIALS_TABLE` | `Materials` 表名或与 API 一致的 **表 ID** |

**M5 起另需**（见 [M5.md](M5.md)）：

| 变量 | 说明 |
|------|------|
| `AIRTABLE_CONSUMPTION_TABLE` | `Consumption_logs` 表名或表 ID |
| `IDEMPOTENCY_LOOKUP_DAYS` | 幂等 lookup 时间窗（天）；**默认 30** |



### 开发与构建



```bash

npm install

npm run icons

npm run dev

```



- **`npm run icons`**：生成 `public/icons/*.png`。

- **`GET /api/health`**、**`GET /api/materials`**、**`POST /api/consumption`**、**`PATCH /api/consumption/[id]/void`**：登录后可用，否则 **401**。

- **`POST /api/login`**：JSON `{ "passcode": "..." }`；超限 **429**。



```bash

npm run build && npm run start

```



### 自检（M3）



- Network / JS bundle 中不应出现 **`AIRTABLE_PAT`** 或 Bearer token。

- 契约仍为 `schemaVersion: 1`（与 M3 示例一致）；若要强制丢弃浏览器旧快照：改 **`MATERIALS_STORAGE_KEY`**（`lib/materials-contract.ts`）。也可 bump **`MATERIALS_SCHEMA_VERSION`**。



