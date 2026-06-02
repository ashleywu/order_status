# 物料消耗采集 App — Airtable 版执行计划

**产品范围**：与 [request.md](request.md) 一致（现场消耗采集 PWA；不做完整库存、不做手机端批次选择、不做复杂后台）。本计划同时约定：**可验证登录会话**、`client_request_id` **服务端幂等**、**登录限速**、**物料缓存与显式刷新**、**Void 规则**、**量级假设**以及 **PWA 不承诺离线** 等实现与安全口径。

首版数据真相落地步骤见里程碑文档 [M1.md](M1.md)（含 `airtable/` 目录下的 schema 与 CSV 种子）。

---

## 核心定位

做一个专门给手机现场记录用的 PWA，不做完整库存系统。

- **Airtable**：后台、物料维护、采购批次、附件、导出和轻量报表。
- **Next.js**：只负责一个无键盘、少滑动、大按钮的消耗采集器。

### 第一版原则

- 不依赖手机软键盘
- 不做搜索框
- 不做批次选择
- 不做完整库存管理前端
- 登录一次，长期保持
- 只能撤销刚刚提交的上一条记录（语义见下文 Void 规则）

---

## 1. 推荐工具栈

| 层级 | 工具 |
|------|------|
| 数据库 + 后台 | Airtable |
| 手机前端 | Next.js + Tailwind |
| UI | Lucide icons，按需 shadcn/ui |
| PWA | manifest；基础 service worker **可选**，**不承诺离线写入** |
| 部署 | Vercel |
| API | Next.js Route Handlers |
| 安全 | Airtable PAT 只放 Vercel 环境变量；通行码 **`APP_PASSCODE_HASH`**（bcrypt / argon2） |
| 登录 | Shared passcode + **可验证**的长效 httpOnly cookie（见 §5.1） |

浏览器 **只访问** 自己的 Next.js API，**不直接**访问 Airtable。

---

## 2. Airtable Base 设计

### 2.0 字段命名（API / 公式稳定性）

- Airtable 里每条字段的 **Field name（API 名）** 固定为 **`snake_case` 英文**，**不要依赖带大量空格的显示名来写代码**。Grid 仍可给人看懂：可用 **Description**、或 Single select **选项的显示文案**（API 仍可传稳定 option 名）；若 Base 改过 Field name，`filterByFormula` 与读写代码会一齐脆。
- **代码、环境变量、`filterByFormula` 一律用下表所列 API 名**（与 Airtable 控制台里「Customize field type」中的名称一致）。

### 2.0.1 各表 Primary field（M1 冻结）

Airtable 每张表有且仅有一个 **Primary field**。约定如下（避免用手机端高频字段 Link/日期误作主列导致建表别扭）：

| 表 | Primary field（API） |
|----|---------------------|
| `Suppliers` | `name` |
| `Materials` | `name` |
| `Material_batches` | `batch_code` |
| `Consumption_logs` | `log_id`（**Autonumber** 或 **Formula**） |

`Consumption_logs` 可另加 **`created_at`**（**Created time**）做审计：**不得**替代 **`occurred_at`** 的业务语义。

### 2.1 `Suppliers`

**Primary field：`name`**

| API 名 | 类型 | 说明 |
|--------|------|------|
| `name` | text | 供应商名称 |
| `notes` | long text | 可选 |

### 2.2 `Materials`（手机端选料核心）

**Primary field：`name`**

| API 名 | 类型 | 说明 |
|--------|------|------|
| `name` | text | 名称 |
| `button_label` | text | 可选，手机按钮短名称 |
| `category` | single select | `ingredient` / `bottle` / `label` / `ribbon` / `packaging` |
| `material_group` | single select | 分组：常用精油 / 基底油 …（选项可按业务配置） |
| `supplier` | link | → `Suppliers` |
| `unit` | single select | `ml` / `g` / `drops` / `piece` / `sheet` / `roll` / `cm` |
| `default_increment` | number | |
| `quick_amounts` | text | 可选，例如 `1,5,10,50` |
| `favorite` | checkbox | |
| `sort_order` | number | |
| `active` | checkbox | |
| `image` | attachment | 可选 |
| `notes` | long text | 可选，**仅后台** |

**后台可选规格字段**（第一版 PWA **不展示**，仅后台查看）：

| API 名 | 类型 |
|--------|------|
| `volume` | number/text 等按实际 |
| `size` | text |
| `color` | text / single select |
| `cap_type` | single select |
| `packaging_type` | single select |

**已知局限（文档约束）**：把规格都放在 `Materials` 上会降低规范化程度，单人 Airtable 维护成本仍可接受。**若未来**需要「规格履历」「同一物料多套规格」「规格随批次差异」，再拆 `Specs` 表或与 `Material_batches` 对齐的结构——第一版不修。

### 2.3 `Material_batches`（采购批次）

**Primary field：`batch_code`**

| API 名 | 类型 | 说明 |
|--------|------|------|
| `batch_code` | text | 与 Primary 同源；批次可读标识 |
| `material` | link | → `Materials` |
| `order_date` | date | |
| `qty_ordered` | number | |
| `price` | number | |
| `shipment_fee` | number | |
| `discount` | number | |
| `supplier` | link | → `Suppliers`；可与 `Materials.supplier` 不同；临时供应商先在 `Suppliers` 建档 |
| `picture` | attachment | 票据/收货图 |
| `notes` | long text | |

第一版手机端 **不** 选择 batch。

### 2.4 `Consumption_logs`（瘦表）

**Primary field：`log_id`**（Autonumber 或 Formula）

| API 名 | 类型 | 说明 |
|--------|------|------|
| `log_id` | autonumber 或 formula | Primary；人机可读标识均可 |
| `material` | link | → `Materials` |
| `usage_type` | single select | `rd_lab` / `product` / `marketing` / `workshop` |
| `quantity` | number | 消耗 **统一正数** |
| `occurred_at` | **date with time** | **业务发生时间**（含时分）；API 写入时服务端可默认当前时刻；**不用** Created time 顶替 |
| `operator` | text | 可选 |
| `device_id` | text | 可选 |
| `client_request_id` | text | **幂等键**（§5.2） |
| `voided` | checkbox | |
| `void_reason` | text | 可选 |
| `note` | long text | 可选 |
| `created_at` | created time | **可选**；仅审计，**不可替代** `occurred_at` |

**第二版可选**：可增加 nullable link 到批次，用于批次追踪（MVP 可不建）。

---

## 3. Airtable 后台视图（不手写后台）

**Materials**：Active materials、Favorites、By category、By material_group、Inactive  

**Material_batches**：Recent purchases、By supplier、By material  

**Consumption_logs**：Today、This week、This month、By usage type、Voided  

**用途**：新增/停用物料；调按钮顺序；设高频物料；录入采购批次；上图/票据；导出 CSV；轻量报表。

---

## 4. 手机 PWA 流程

核心：**选物料 → 选用途 → 调数量 → 提交 → 有误则立刻撤销上一条**。

### 4.1 Login

- Shared passcode：`POST /api/login` 将用户输入与 **`APP_PASSCODE_HASH`** 做 **bcrypt 或 argon2** 校验，**禁止生产环境用环境变量存明文口令并做字符串相等比较**（§5.1a）。  
- 成功后设置长效 httpOnly cookie（如 Max-Age 180 或 365 天）  
- 生产：**Secure**，**SameSite=Lax**  
- Cookie 内容必须为 **签名或可验证令牌**，不得为随机明码字符串（§5.1）

### 4.2 Home

- Favorite / 高频物料大按钮  
- 最近使用物料（可选）  
- 分类入口  
- **大号「刷新物料」或等价入口**（与 §6 缓存策略配套）  

### 4.3 Material Picker（无搜索框）

- 分类 Tabs + **`material_group` 分组** chips  
- 大按钮网格；按 Favorite、Sort order  
- 仅 `Active = true`  
- 物料太多：后台调 **`material_group` / `sort_order`**，不靠手机搜索  

### 4.4 Usage Type

四个大按钮：R&D / Lab · Product · Marketing · Workshop  

### 4.5 Quantity

- 大 +/-、当前数量、快捷数量；默认 `default_increment`，`quick_amounts` 可解析为快捷档位  
- 第一版尽量不用键盘；自定义数字放入第二版  

### 4.6 Submit

- 大按钮、提交中 disabled、成功强反馈、失败可重试  
- `clientRequestId` 必填，用于幂等（§5.2）  

### 4.7 Undo（第一版）

- 仅 **当前设备 / 当前会话** 刚刚 **提交成功** 的 **一条**  
- POST 响应返回 Airtable `record_id`；前端存内存 state / 可选 sessionStorage；“Undo last”  
- Void 成功后隐藏或禁用；**刷新页面不保证仍可撤销**

---

## 5. Next.js API、安全细则与幂等

### 5.1 登录 Cookie 必须可验证

**禁止**：往 cookie 里「随便塞一个字符串」冒充已登录。

**实现任选其一**：

- [`iron-session`](https://github.com/vvo/iron-session)  
- [`jose`](https://github.com/panva/jose) 等 **HMAC JWT** cookie  
- 自研：用 **SESSION_SECRET** 对 payload **HMAC 签名**（含过期时间与会话版本），服务端验签通过后视为已登录  

要求：长效（如 180/365 天）仍须 **不可伪造**、防篡改。

### 5.1a 通行码存储（不要明文比较）

- **推荐（与可验证会话同级）**：环境变量只放 **`APP_PASSCODE_HASH`**（bcrypt / argon2 哈希）。`POST /api/login` 对明文口令做 `verify`，通过后签发会话。
- **本地调试**：可短暂使用明文 `APP_PASSCODE` **仅非生产**；合并到生产分支前必须改为 hash，且 **生产构建不得读取明文口令**。

### 5.2 `client_request_id` 服务端幂等（强制）

原因：Airtable **没有**数据库式唯一索引；弱网 / 重复点击会导致重复记录。

**`POST /api/consumption` 流程**：

1. 前端生成 `clientRequestId`（如 UUID）。  
2. 服务端写入前：用 `filterByFormula` **同时**约束：  
   - `{client_request_id}` 等于本次值（注意公式转义）；**且**  
   - 记录创建时间在 **最近 N 天内**（**N 建议 7 或 30**，可环境变量配置），用 **`CREATED_TIME()`** 或与 `occurred_at` **组合**，缩窄查找窗口（业务发生时刻仍以 **`occurred_at`** 为准）。
3. **若已存在**：不创建；**直接返回已有记录的 Airtable `record_id`**（及与首次成功一致的响应形态）。  
4. **若不存在**：创建新记录。  

说明：`clientRequestId` 为 UUID 时全表碰撞概率极低，**MVP 仅按 id 查**也可接受；**时间窗口**是给数据量变大时的便宜优化与安全边界（过久远的同 id 重放视为新提交——实际不可发生则无害）。  

效果：重试、弱网、重复点击不会产生多条逻辑重复的消耗日志。
### 5.3 登录接口轻量限速

- **目标**：非银行级，仅挡脚本撞 passcode。  
- **MVP**：Route Handler 内 **按 IP 滑动窗口**节流（超限返回 429）。  
- **演进**：再上 Upstash Redis 等分布式计数（多实例一致）。

### 5.4 Void API（MVP 采用「中间方案」）

**必须**：

- 请求已登录（§5.1 验签通过）  
- 目标 record 存在  
- **`voided` 当前为未勾选（false）**  

**写入**：PATCH 将 `voided = true`，可选填写 `void_reason`。

**产品与实现中间方案**：与 Undo 语义一致——前端仅对 **本会话最近一次成功提交** 展示 Undo；服务端 **MVP 可不要求**「必须是数据库里最近一条」（降低复杂度）。若以后要防枚举 record id，可升级为：

- **增强版 A**：只允许撤销当前 session **最近提交的**那条（服务端维护 `lastRecordId`）；或  
- **增强版 B**：POST 响应返回 **`undo_nonce`**，`PATCH void` body 必须带该 nonce  

第一版采用「**已登录 + record id + 未 void**」即可；**文档需说明**：安全边界并非「防猜 id」，对单人小团队可接受。

### 5.5 Route Handlers 清单与环境变量

**Handlers**：

- `POST /api/login`、`POST /api/logout`  
- `GET /api/materials`（§6）  
- `POST /api/consumption`（§5.2）  
- `PATCH /api/consumption/[id]/void`（§5.4）  

可选：`GET /api/recent-logs`

**环境变量**：`AIRTABLE_PAT`、`AIRTABLE_BASE_ID`、`AIRTABLE_MATERIALS_TABLE`、`AIRTABLE_CONSUMPTION_TABLE`、`APP_PASSCODE_HASH`（生产）、可选 `APP_PASSCODE`（仅非生产调试）、`SESSION_SECRET`，以及会话库所需其它项。**勿**在生产使用明文口令比对。

**服务端**：校验会话；读写 Airtable；**不向浏览器泄露 PAT**。

---

## 6. 性能与状态管理（Materials 必须有刷新出口）

### 6.1 `GET /api/materials`：响应与白名单字段

服务端从 Airtable 读取 `Materials`（仅 `active` 视图或公式过滤），**映射后只返回 PWA 所需字段**，不要把 `notes`、规格列、附件原始 blob、或其它后台敏感列整包发给手机。

**顶层 JSON**：

| 字段 | 说明 |
|------|------|
| `materials` | 见下表白名单数组 |
| `generatedAt` | ISO 时间戳（本次接口生成时刻） |
| `schemaVersion` | **服务端硬编码整数**（如 `1`）。**当前端缓存结构或本接口字段契约变更时 bump** |
| （可选）`version` | 若仍希望材料数据有一批「revision」，可服务端 bump；与 `schemaVersion` 分工：`schemaVersion` 管 **wire/cache 形状**，`version`（若有）管 **业务数据批改**——也可只保留二者之一简化实现 |

**`materials[]` 每一项**（camelCase JSON 可与前端对齐）：

| 字段 | 说明 |
|------|------|
| `id` | Airtable record id |
| `name` | |
| `buttonLabel` | 由 `button_label` 映射，空则用 `name` |
| `category` | |
| `group` | 由 **`material_group`** 映射（单选显示名或选项名） |
| `unit` | |
| `defaultIncrement` | 来自 `default_increment`（服务端规范为整数 ≥1） |
| `quickAmounts` | `number[]`：由 **`quick_amounts`** 字符串解析（如 `"10,50,100"`）；**每项须为 `defaultIncrement` 的正整数倍**且 **≥ `defaultIncrement`**，与 [M3.md](M3.md) **`lib/quantity-defaults.ts`**、[M4.md](M4.md) **Quantity**钉死对齐 |
| `favorite` | |
| `sortOrder` | 来自 `sort_order` |
| `active` | |
| `imageUrl` | **可为 `null`**：首张 `image` 的 **`url`**；不向客户端返回整段 attachments |

**不要**在同一响应中包含：后台备注全文、供应商细节、采购价、`Material_batches` 汇总等；除非已实现稳定 CDN/URL 策略且确认为必要。

### 6.2 前端策略与 `schemaVersion`

1. **启动**：可先用 **localStorage** 快速渲染缓存；若缓存中的 **`schemaVersion` ≠ 本次接口返回**，**丢弃整块物料缓存**再写入新列表（避免结构升级后读到畸形数据）。  
2. **后台静默**：拉取成功后更新 state + localStorage（含 `schemaVersion`、`generatedAt`）。  
3. **显式**：**大号「刷新物料」**或 **下拉刷新**，强制请求 `GET /api/materials`。  

确保 Airtable 后台改了排序 / 分组 / Active 后，手机 **不会永久卡在旧列表**。

### 6.3 通用

- 最近使用：`localStorage`（或多端一致延后）  
- 刚提交的 `record_id`：内存 state / sessionStorage（配合 Undo）  
- 只对提交、void、`GET materials`（及登录）调用 Airtable；**勿高频轮询**  
- **不建复杂离线队列**（第一版）

### 6.4 量级假设

- **第一版假设**：`Active` 物料约 **数十～数百条**，**全量 GET** `/api/materials` 可行。  
- **若近千条级以上**：不应每次全量拉，需 **按 `category` / `group`（源字段 `material_group`）分页或拆分请求**（第二版架构项）。

---

## 7. PWA 与不承诺离线

第一版验收 **仅**：

- `manifest` 存在且可安装/「添加到主屏幕」  
- 手机打开 **在线** 场景下体验良好（大屏按钮、加载/错误/重试）  

**不验收、不承诺**：

- 离线打开、离线写入、后台同步  

**说明**：「装到主屏幕」**≠**「离线可用」；不写 service worker 或不做离线队列时，须在文档与用户预期中写明。

---

## 8. 部署与安全核对

- Vercel 部署 Next；密钥仅环境变量；生产 cookie `Secure`。  
- 设备遗失：轮换通行码（更新 **`APP_PASSCODE_HASH`**）、**`SESSION_SECRET`**（及会话签发逻辑若绑定版本）。  
- 发布前检查：前端 bundle 与 Network **无 Airtable Token**。

---

## 9. 验收清单（摘要）

**手机**：长效可验证登录；可安装；高频/分组选料无需搜索；四类用途；大按钮数量；提交与幂等语义；撤回刚提交的一条；失败可重试；**可刷新物料列表**；**`GET /api/materials` 仅白名单字段、无后台敏感信息**。  

**后台**：物料增删改序；批次录入；视图与 CSV；消耗表无不必要冗余字段。  

**安全**：PAT 不暴露；未登录不可写 consumption/void；生产 **口令为 hash 校验**；**幂等与限速**可按 §5 自测。

---

## 10. 试用 3～7 天后的第二版观察项

（与原版相同方向：是否真能无搜索、分组是否合理、increment、撤销频率、自定义数量、扫码、operator、离线、库存提醒、批次、成本报表等。）

---

## 11. 开发顺序（建议）

1. 确认字段、单位、分组与高频物料  
2. 建 Airtable Base、视图、示例数据  
3. Next.js + Tailwind；PWA manifest  
4. §5.1 可验证 cookie + **§5.1a 口令 hash 登录** + §5.3 限速 + logout  
5. Airtable 服务端封装  
6. `GET /api/materials`（白名单字段 + `generatedAt` + **`schemaVersion`** + 可选 `version`）  
7. 大按钮选料 UI + §6 缓存与刷新  
8. 用途页 + 数量页  
9. `POST /api/consumption`（§5.2 幂等）+ 反馈 + Undo（§5.4）  
10. Vercel 部署 + **真机** + PWA **安装验收**（不承诺离线）  
11. 试用后调分组与 UI；若量级突破再打开 §6.4  
