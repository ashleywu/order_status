# M1 · Airtable Base 落地说明

与本里程碑文档 [../M1.md](../M1.md)、总计划 [../plan-airtable.md](../plan-airtable.md) §2 一致。

## 建表顺序

1. **Suppliers**：Primary = **`name`**；按 `schema-m1.json` 建字段（Customize field → **API 名**一致）。  
2. **Materials**：Primary = **`name`**；先建 **`category`、`unit`、`material_group`** 单选（其中 **`unit`** 含 `drops` 表示「滴」），再建 **`supplier`** → Suppliers（单/多链接均可；CSV 里写一条供应商 `name` 即按主字段匹配——建议 `name` 全局唯一）。  
3. **Material_batches**：Primary = **`batch_code`**；**`material`** → Materials，**`supplier`** → **Suppliers**（Link；临时供应商先在 Suppliers 建一条）。  
4. **Consumption_logs**：Primary = **`log_id`**（Autonumber 或 Formula）；**`occurred_at`** 用 **含时间的日期**；可选加 **`created_at`**（Created time）仅审计。建好 **`usage_type`** 四选项后再导入。

视图过滤器见 `M1.md` §7，按团队语言命名即可。

## 示例数据导入（CSV）— **全部可选**

`seeds/*.csv` 只是 **字段名模板 +（部分文件）示例行**，方便第一次对照 [schema-m1.json](./schema-m1.json) 做 CSV 导入或跑 M1 验收清单。**不强制使用**：你完全可以只在 **Airtable UI** 里建表、录数据；**消耗记录** 日常由 **PWA（M5）** 写入，不必先往 CSV 里填。

| 文件 | 典型用途 |
|------|----------|
| `suppliers.csv` / `materials.csv` | 可选：批量导入首批供应商/物料 |
| `material_batches.csv` | 可选：批次示例 |
| `consumption_logs.csv` | **仅表头**：列名与 API 字段对齐；**无示例行**——历史消耗请你在 UI 录入，或由 App 提交产生 |

**编码**：`seeds/*.csv` 为 **UTF-8 with BOM**（字节序标记 `EF BB BF`）。含中文时请勿用 Excel 另存为「CSV ANSI」；若 Airtable 仍乱码，用 VS Code / 记事本确认以 UTF-8 打开后重新导入本仓库文件。

**若提示 “Can't import CSV file / Invalid data”**（常见原因）：

1. **列数不一致** — 某行逗号多/少（尤其 `notes` 后 `volume`…`packaging_type` 应对齐表头 17 列）。可用 `materials.fixed.csv` 或仓库最新 `materials.csv`。  
2. **导入顺序** — 必须先 **Suppliers**，再 **Materials**（`supplier` 列才能 Link 上）。  
3. **字段类型已建好** — 向已有表追加时，`category` / `unit` / `material_group` 选项须与 CSV 一致；`favorite` / `active` 建议为 **Checkbox**，CSV 用 `true` / `false`（仓库已规范化）。  
4. **Link 对不上** — `supplier` 文本须与 Suppliers 表 **`name` 完全一致**（先导入 suppliers.csv）。

1. 在 Airtable **Suppliers** 表：`Extensions` → CSV import，选 `seeds/suppliers.csv`（或拖拽），字段映射确认列名对应 API 字段。  
2. **Materials**：导入 `materials.csv`；**supplier** 列填的是 Suppliers 表的 **首列主字段（一般为 `name`）**，须与第一步已存在的名称完全一致。  
3. **Material_batches**：导入 `material_batches.csv`；**material** 列为 Materials 的 **`name`**；**supplier** 列为 Suppliers 的 **`name`**。  
4. **Consumption_logs**：导入 `consumption_logs.csv`；**material** 同样为 **`name`**。  
   - **`log_id` 不在 CSV 里（正常）**：表 Primary 为 **Autonumber** 的 `log_id` 时，导入 CSV **不要**包含 `log_id` 列——Airtable 导入后 **自动生成** 1、2、3…；`created_at` 若用 Created time 类型也 **不要**写进 CSV。  
   - **`voided`**：Checkbox；若用 CSV 导入，建议 `true` / `false`。  
   - **`occurred_at`**：使用 **含时间** 的格式（例如 `YYYY-MM-DDTHH:mm` 或带时区 ISO 8601），与字段类型 **Date with time** 一致。

若你走 M1 验收清单 [M1.md](../M1.md) §8，需自行在 UI 或 CSV 中凑够示例行数；**不导入种子也算正常**，只要表结构正确即可继续 M2+。

## 环境与后续 Milestone（勿提交密钥）

建议在 Vercel / 本地只通过环境变量配置（示例名，以实现为准）：

- `AIRTABLE_PAT`
- `AIRTABLE_BASE_ID`
- `AIRTABLE_TABLE_SUPPLIERS`、`..._MATERIALS`、`..._BATCHES`、`..._LOGS`（表名或表 ID）

PAT、Base ID **不要** 提交到仓库。

## 协作约定（Python）

本目录若有 **Python** 辅助脚本：**注释与 docstring 一律用英文**（`#` / `"""..."""`），避免多人协作时出现中英混写分叉。

## 校验

对照 [schema-m1.json](./schema-m1.json)：**Consumption_logs** 不得存在 plan 禁止的冗余列（`supplier`/`color`/单价等作为主档镜像）；Lookup 仅用于视图报表则允许。
