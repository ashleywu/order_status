# 物料消耗采集 — 需求说明（Request）

本文档约束产品范围：面向手机现场的 **消耗记录 PWA** + **托管数据后端**。当前选定 **Airtable + Next.js** 路线的执行细则见 [plan-airtable.md](plan-airtable.md)。**不做**完整进销存、不做复杂库存编辑后台、不做订单业务页面。

---

## 1. 背景与目标

- **使用者**：朋友在经营精油相关产品，需在手机上 **高频、快速** 记录每日原材料消耗。
- **核心诉求**：一页完成「今天用了什么 → 用在哪类用途 → 多少 → 提交」；尽量少键盘、少用复杂多级下拉。
- **体验**：偏「大号友好 Excel 的信息结构」，但通过 **移动端 PWA** 呈现，视觉与单手操作优于原始表格。

---

## 2. 用途类型（Usage）— 固定四类

每笔消耗必须对应以下之一（可用大按钮分区，不宜做长下拉）：

1. **R&D / Lab Use**
2. **Product**
3. **Marketing**
4. **Workshop**

---

## 3. 物料类别与字段需求

以下为 **主数据 / 批次 / 扩展表** 应能表达的信息清单（**不在消耗表里重复存储**这些内容）。

### 3.1 Ingredient（原料/精油等）

| 字段 | 说明 |
|------|------|
| Volume | 规格体积 |
| Supplier | 供应商（建议 `supplier_id` 关联） |
| Date/Time of order | 下单时间（宜在采购批次） |
| Batch of Orders | 批次标识（宜在采购批次） |
| Price | 单价/批次价（宜在采购批次） |
| Shipment Fee | 运费（宜在采购批次） |
| Discount | 折扣（宜在采购批次） |
| Picture | 附图（URL / 附件，非消耗表冗余） |

### 3.2 Bottle（瓶器）

| 字段 | 说明 |
|------|------|
| Size | 规格 |
| Supplier | 供应商 |
| Date/time of Order | 下单时间（批次） |
| Batch of Order | 批次（批次） |
| Quantity (unit) | 采购数量（批次） |
| Color | 颜色 |
| lid/cap Type | 盖型：下拉类（drop、平盖等） |
| Price | 价格（批次） |
| Picture | 附图 |

### 3.3 Label（标签）

| 字段 | 说明 |
|------|------|
| Size | 规格 |
| Color | 颜色 |
| Quantity | 数量 |
| Price | 价格 |
| Supplier | 供应商 |
| Picture | 附图 |
| Date/Time of Order | 下单时间（批次） |
| Batch of Order | 批次（批次） |

### 3.4 Ribbon（丝带等）

| 字段 | 说明 |
|------|------|
| Size | 规格 |
| Color | 颜色 |
| Quantity | 数量 |
| Price | 价格 |
| Supplier | 供应商 |
| Picture | 附图 |
| Date/Time of Order | 下单时间（批次） |
| Batch of Order | 批次（批次） |

### 3.5 Packaging（包装）

| 字段 | 说明 |
|------|------|
| Size | 规格 |
| Color | 颜色 |
| Quantity | 数量 |
| Price | 价格 |
| Type | **下拉**：Product level / Order Level / Filling / Tape / Shipping Label |
| Supplier | 供应商 |
| Picture | 附图 |
| Date/Time of Order | 下单时间（批次） |
| Batch of Order | 批次（批次） |

---

## 4. 产品范围（In Scope）

- **移动端 PWA**：单主干流程——选择物料 → 选择用途 → 调整数量 → 提交。
- **高频优化**：常用物料用大按钮或可配置「收藏」；展示「最近使用」列表。
- **数据后端**：由 **托管服务**（如 Supabase 或 Airtable）承载；**不写自架重型自建后台服务**。**当前工程选型：Airtable**，见 [plan-airtable.md](plan-airtable.md)。
- **主数据与批次**：在库中维护 `materials`、采购批次、分类扩展表；图片存 URL/附件，不塞进消耗行。

---

## 5. 明确不做（Out of Scope）

- 完整 ERP / 全链路库存管理系统。
- 复杂库存编辑界面（若在 Airtable/Supabase 表内轻度改数可接受，但 **不在 PWA 内做大表单**）。
- 订单（Orders）业务流程页面。
- 在消耗表中重复存储 supplier、color、batch、picture 等物料属性。

---

## 6. 数据模型（契约）

### 6.1 原则

- **一张瘦消耗表**：只记「谁在何时用了哪个物料多少、归于哪类用途」，物料详情一律 join 或通过 API 扩展读取。
- **统一物料主档 + 批次 + 分型扩展**：避免单一超宽 dirty 表，也避免五套完全割裂的「五个 App」。

### 6.2 建议表结构（逻辑）

- **`materials`**（通用主表）  
  - 共有字段：`id`, `name`, `category`（ingredient | bottle | label | ribbon | packaging）, `supplier_id`, `unit`, `image_url`, `created_at`，等。
- **`material_batches`（或 `purchase_batches`）**（采购批次）  
  - 与采购相关的：`price`, `quantity_ordered`, `order_date`, `shipment_fee`, `discount`, `batch_code` / `batch_label`，等；关联 `material_id`。
- **分类扩展表**（各表 keyed by `material_id`）：  
  - `ingredient_specs`  
  - `bottle_specs`  
  - `label_specs`  
  - `ribbon_specs`  
  - `packaging_specs`  

### 6.3 消耗表（Consumption / Usage Log）

必填或核心字段：

- `timestamp`（服务端写入或客户端传入，以一致策略为准）
- `material_id`
- `usage_type`（枚举：上述四类之一）
- `quantity`（与 `materials.unit` 一致；符号约定在项目内统一，如消耗为正、冲销为负或单独类型）

可选字段：

- `note`
- `operator`（用户标识或手写名字，视登录方案而定）
- **`batch_id`（nullable）**：MVP 可空；若未来要按批次扣减或成本核算，沿用此列即可，无需推翻表结构。

---

## 7. 后端选型说明

**已实现路径**：**Airtable + Next.js**（执行计划见 [plan-airtable.md](plan-airtable.md)）。

下列对照仍可作架构参考：

| 选项 | 适用 |
|------|------|
| **Supabase** | 由技术人员维护 Schema；关系清晰、Auth/Storage/SQL 报表友好；与本需求中的规范化模型贴合。 |
| **Airtable** | 业务方可在网格中改字段、视图、附件；API 量与计费需留意。 |

---

## 8. PWA 交互与非功能偏好

- 尽量减少键盘输入；数量用 stepper / 预设档位。
- 用途四类用大区块切换，避免深层导航。
- 图片仅在主数据中展示或维护路径，录入消耗时 **默认不要求**上传图。
- 网络差场景：**MVP 可仅在线提交**；若现场反馈强烈，再排期「离线队列 + 同步」。

---

## 9. 验收口径（可作一期 Done 定义）

- 手机浏览器可安装/固定为 PWA，完成一条消耗记录全流程 **≤ 3～4 次明确点击（不含数量微调）**。
- 数据落库后可按日期 / 物料 / 用途导出或在 Supabase/Airtable 中筛选核对。
- 消耗记录行 **不**冗余存储第三章所列物料明细字段。

---

## 10. 文档维护

需求变更时请更新本文件版本与日期。

- **文档版本**：0.1  
- **日期**：2026-05-26  
