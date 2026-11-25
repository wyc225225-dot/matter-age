# Matter Age 化学知识库

本地资料涵盖 118 种元素、532 个物质记录、435 条反应/变化资料、131 个上游来源链接。

## 数据与游戏的关系

元素资料由 PubChem 周期表采集，BODR 补充周期、族、区和共价半径事实。GitHub 反应目录只提取结构化化学事实和引用，未复制上游解释、图片或程序。来源 commit、日期与用途详见 SOURCES.json。

物质资料按相态和同素异形体区分；532 个资料记录不是声称有 532 个已接入游戏的收集项。反应资料中 193 条仅有方程式证据，其他条目也须显式适配本项目的条件和状态才能成为游戏配方。所有条目保持 pending，但无需新增用户审批流程即可在开发预览继续集成。

## 刷新

1. 获取 PubChem 快照并运行 npx tsx scripts/knowledge/import-elements.ts。
2. 在 knowledge/vendor 下拉取/更新对应仓库，记录 commit。
3. 运行 npx tsx scripts/knowledge/import-github.ts。
4. 运行校验与界面测试后再接入游戏目录。

源快照和 vendor 不由网页下载。知识页面使用本地 JSON，运行无需联网。
