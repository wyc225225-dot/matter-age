# 118 种化学元素资料

来源：[PubChem 周期表数据接口](https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON)，采集于 2026-11-25。原始快照在 knowledge/sources/pubchem-periodic-table.json，结构化本地数据在 src/data/elements.json。

逐元素保留英文标准名、原子序数、符号、来源分类、原子量文本、电子排布、常见氧化态及可用物性。来源缺失值保留 null；预测状态明确标注，未经逐元素专业核验。

元素不是物质收集项；H、H2、水中的氢代表相关但不同的层级。化学反应重排原子，不改变原子核身份；本游戏不模拟核转变。

中文名覆盖前103种，后续暂保留来源英文名，避免未核验译名。
