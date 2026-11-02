# Prehistoric Tribes · Web

[English](README.md) · **中文**

**Prehistoric Tribes**（史前部落）原是一款 2008 年的 J2ME 手机即时战略游戏，这里把它重制成了网页版，浏览器打开就能玩。
游戏规则按原版程序逐条移植；画面、操作和界面都按手机触屏重新做过：高清重绘美术，WebGL 地图，中文和英文两种语言。

这个项目由 [BOMBWCC](https://github.com/BOMBWCC) 和 Claude（Anthropic 的 AI）一起完成。

> 本项目是非官方的爱好者重制，仅供学习与交流。原作及其美术、音乐、文字的版权归原权利人所有。

**在线试玩**：<https://bombwcc.github.io/Prehistoric_Tribes_Web/>（手机建议竖屏，从浏览器“添加到主屏幕”后打开）

## 本地运行

需要 Node.js 20 以上。

```bash
cd web
npm install
npm run dev          # 开发服务器 http://localhost:5173（手机连同一 Wi-Fi 用电脑的局域网地址）
npm run build        # 类型检查 + 打包到 web/dist/
```

## 测试

```bash
cd web
npm test             # 函数测试：scripts/verify-*.mjs，逐个检查移植的原版方法
npm run scenarios    # 场景测试：tests/scenarios/*.mjs，在无头 Chrome 里玩一局，检查玩法和界面
```

场景测试要用本机装的 Google Chrome；可以只跑名字里带某个词的，例如 `npm run scenarios -- build hut`。

## 目录

```
web/                    游戏本体（TypeScript；地图用 PixiJS 画，界面是网页元素）
  index.html            入口页
  src/                  代码，见下一节
  public/
    hd/                 高清美术：地图零件、建筑、动物、特效、界面、菜单、剧情图、头像
      catalog.json      素材目录：每张图贴在格子的哪里（scripts/make-catalog.mjs 生成）
    i18n/               游戏文字（zh-CN、en）：story.json 剧情和教程、ui.json 界面、help.json 帮助、
                        speakers.json 剧情人物名、names.json 村民名字库
    assets/             原版的规则数据、地图、音乐和文字表
  scripts/              函数测试 verify-*.mjs；工具：import-hd.mjs 导入高清图、make-catalog.mjs 生成素材目录
  tests/                场景测试：run.mjs 运行器、scenarios/ 各组测试、baseline/ 乱点测试的基准
tools/debug/stage.js    调试用：在浏览器里直接摆出某个局面（场景测试也用它）
docs/translation-zh-CN.json   原版自己的几个画面用的中文
```

## 代码：哪个文件管什么

路径相对 `web/src/`。名字是 `Legacy*.ts` 的文件，是原版某一个方法的逐条翻译，文件开头写着对应的原版方法；`*Runtime.ts` 把这些方法接起来。

### 启动和整体

| 文件 | 管什么 |
|---|---|
| `main.ts` | 开机、每步的游戏循环（每秒 8 步）、把各部分接起来 |
| `core/LegacyRuntimeState.ts` | 运行时总状态：所有游戏数据都挂在这里 |
| `core/LegacyGameState.ts`、`DenseLayout.ts` | 游戏状态的字段，以及单位、建筑数据的排布（`UNIT_*`、`BLD_*`） |
| `core/DataTables.ts` | 原版数据表的编号和含义，比如敌人来袭的间隔表 |
| `core/LegacyGameplayTick.ts` | 对局中的一步：依次更新单位、部落、世界 |
| `platform/` | 浏览器适配层：画布、图片、按键（`Input.ts`）、声音（`Audio.ts`）、存储（`RecordStore.ts`）、原版的随机数（`LegacyRandom.ts`） |

### 村民和单位（`sim/units/`）

| 文件 | 管什么 |
|---|---|
| `UnitRuntime.ts` | 单位每步的更新入口 |
| `LegacyEntityTargetStep.ts`、`LegacyEntityMoveTrigger.ts` | 朝目标走一步；接到“走过去”的命令 |
| `LegacyEntityWorkDeposit.ts` | 采集和把东西送回仓库 |
| `LegacyEntityHappiness.ts`、`LegacyEntityCourtship.ts`、`LegacyEntityHousing.ts` | 心情；求偶生孩子；给没家的人分小屋 |
| `LegacyEntitySkillGain.ts` | 干活涨技能 |
| `LegacyEntityStrikeGate.ts`、`LegacyEntityHealthDelta.ts` | 一次攻击（命中和伤害）；血量变化 |
| `LegacyEntityEquipIssue.ts`、`LegacyEntityProduceItem.ts` | 从仓库发武器；军械库造武器 |
| `LegacyEntityPlacement.ts`、`LegacyEntityResourceCost.ts` | 放建筑；造价、升级和修理的费用 |
| `LegacyAnimalRoam.ts`、`LegacyAnimalHitReaction.ts` | 动物游荡；动物挨打后逃跑或还手 |
| `LegacyEntityAbduction.ts` | 敌人用气球拐走小孩 |

### 部落、敌人和剧情（`sim/tribe/`）

| 文件 | 管什么 |
|---|---|
| `TribeRuntime.ts` | 部落每步的更新入口；建筑最高能升几级 |
| `LegacySubsystemBuildingEconomy.ts` | 施工进度、完工、自动招建筑工 |
| `LegacySubsystemAs.ts`、`Av.ts`、`Aw.ts`、`At.ts` | 敌人多久来一波、派谁来、走向集结点、找目标打人打建筑 |
| `LegacySubsystemUnitTraining.ts` | 敌方补兵和训练 |
| `LegacySubsystemBM.ts` | 集结和全员备战时走向集合点 |
| `LegacySubsystemEntityRRoll.ts`、`LegacySubsystemEntityRegen.ts` | 饥饿和疲劳随时间下降；回血 |
| `LegacySubsystemAk.ts` | 胜负判定 |
| `LegacySubsystemAl.ts` | 教程的步骤：等玩家做到哪一步 |
| `LegacySubsystemV.ts`、`LegacySubsystemU.ts` | 各关的剧情脚本（第 4 关用 U） |

### 地图和寻路（`sim/world/`）

| 文件 | 管什么 |
|---|---|
| `WorldRuntime.ts` | 读地图、世界每步的更新入口；自定义地图补的浆果 |
| `LegacyMapRleDecoder.ts`、`LegacyTerrainAdjustment.ts` | 解压地图数据、调整地形 |
| `LegacyPathE.ts`、`LegacyPathPreparation.ts`、`LegacyPathDirection.ts`、`LegacyPathCellPredicate.ts` | **寻路**：路径搜索、准备、选方向、哪些格子能走 |
| `LegacyNearestCandidateSearch.ts` | 找最近的目标（树、石头、建筑……） |
| `LegacyFootprintCheck.ts`、`LegacyOccupancyClass.ts` | 建筑占地能不能放；格子的迷雾和占用 |
| `MapUpkeep.ts` | 拆除计时、记下“见过的建筑” |

### 画面（`render/`）

| 文件 | 管什么 |
|---|---|
| `PixiMap.ts` | WebGL 地图：地面区块、树石建筑、人和动物（两步之间补间移动）、特效、迷雾、放置格、框选框 |
| `MapScene.ts` | 从游戏状态算出这一刻要画哪些人、标记和特效 |
| `HdArt.ts` | 按素材目录取高清图、拼村民的零件 |
| `MapMargin.ts` | 地图外圈 |
| `LegacyCameraScroll.ts`、`LegacyCameraFollow.ts` | 镜头移动、跟随 |
| `LegacyMapOverview.ts` | 小地图每格的颜色 |
| `RenderRuntime.ts`、`WideView.ts` | 原版绘制代码里还在用的部分（村民面板的数值、导出工具） |

### 界面和操作（`web/src/` 根目录）

| 文件 | 管什么 |
|---|---|
| `WideScreen.ts` | 屏幕和视野：视野位置、拖动、缩放、屏幕坐标换算成格子 |
| `TouchControls.ts` | 触屏和鼠标：点、拖、长按框选，把手势变成游戏命令 |
| `Hud.ts` | 游戏中的界面：顶栏、建造按钮和建造列表、命令按钮（全员备战、集结、村民名单、小地图）、建筑面板、村民面板、编队、放置建筑和旗子、选族长、游戏菜单 |
| `StartMenu.ts` | 开始菜单：战役 / 自定义、难度、地图、语言、声音 |
| `StoryHud.ts` | 剧情和对话的播放、底部对话框、村民回话、胜负结算页 |
| `story/StoryData.ts`、`story/StoryScenes.ts` | 原版对话号对应到剧情段名；演出（山洞动画、剧情插图） |
| `Alerts.ts` | 消息条（出生、完工、受到攻击……），点了跳到出事的地方 |
| `MiniMap.ts` | 小地图页 |
| `Settings.ts`、`HelpCard.ts`、`MenuHud.ts` | 设置卡、帮助卡、原版菜单画面的按钮 |
| `text/UiText.ts` | 按当前语言取界面文字（`ui("组.名字")`） |
| `ui/` | 原版的菜单流程和命令（`LegacyStateMachine.ts` 画面切换，`LegacyZAf.ts` 等是命令栏的命令） |
| `save/` | 存档和读档（`RmsGameplayRecord.ts` 是存档格式） |

## 反馈问题

欢迎提 Issue，最好写上：手机或电脑和浏览器、语言、第几关、做了什么、看到了什么、本来应该是什么，有截图更好。
