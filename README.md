# Prehistoric Tribes · Web

**English** · [中文](README.zh-CN.md)

**Prehistoric Tribes** is a 2008 J2ME real-time strategy game for mobile phones. This is a remake for the web: open it in a browser and play.
The game rules are ported from the original program method by method; the graphics, controls and interface are redone for touch phones: redrawn HD art, a WebGL map, English and Chinese.

This project is made by [BOMBWCC](https://github.com/BOMBWCC) together with Claude (an AI by Anthropic).

> An unofficial fan remake, for learning and sharing only. The original game and its art, music and text belong to their respective owners.

**Play online**: <https://bombwcc.github.io/Prehistoric_Tribes_Web/> (on a phone, hold it upright and use "Add to Home Screen" for full screen)

## Run it locally

Needs Node.js 20 or later.

```bash
cd web
npm install
npm run dev          # dev server at http://localhost:5173 (on a phone on the same Wi-Fi, use the computer's LAN address)
npm run build        # type check + bundle into web/dist/
```

## Tests

```bash
cd web
npm test             # function tests: scripts/verify-*.mjs, one per ported original method
npm run scenarios    # scenario tests: tests/scenarios/*.mjs, play a game in headless Chrome and check the rules and the UI
```

The scenario tests use the Google Chrome installed on your machine. To run only some, give words from their names, e.g. `npm run scenarios -- build hut`.

## Layout

```
web/                    the game (TypeScript; the map is drawn with PixiJS, the interface is HTML)
  index.html            entry page
  src/                  the code, see the next section
  public/
    hd/                 HD art: map pieces, buildings, animals, effects, interface, menus, story pictures, portraits
      catalog.json      art catalog: where each picture sits on its tile (made by scripts/make-catalog.mjs)
    i18n/               game text (zh-CN, en): story.json story and tutorial, ui.json interface, help.json help,
                        speakers.json story characters' names, names.json villager names
    assets/             the original's rule data, maps, music and text tables
  scripts/              function tests verify-*.mjs; tools: import-hd.mjs imports the HD art, make-catalog.mjs builds the catalog
  tests/                scenario tests: run.mjs runner, scenarios/ the test groups, baseline/ random-play baselines
tools/debug/stage.js    debugging: set up a game situation in the browser (the scenario tests use it too)
docs/translation-zh-CN.json   Chinese for the few original screens still in use
```

## The code: which file does what

Paths are relative to `web/src/`. A `Legacy*.ts` file is a line-by-line translation of one method of the original, named in the file's header; the `*Runtime.ts` files wire those methods together.

### Start-up and the whole

| File | What it does |
|---|---|
| `main.ts` | start-up, the game loop (8 steps a second), connecting the parts |
| `core/LegacyRuntimeState.ts` | the runtime state that holds all game data |
| `core/LegacyGameState.ts`, `DenseLayout.ts` | the game state's fields and how unit and building data are laid out (`UNIT_*`, `BLD_*`) |
| `core/DataTables.ts` | the original's data tables by number and meaning, e.g. the raid interval table |
| `core/LegacyGameplayTick.ts` | one step of a game: update units, tribes and the world in turn |
| `platform/` | the browser layer: canvas, images, keys (`Input.ts`), sound (`Audio.ts`), storage (`RecordStore.ts`), the original's random numbers (`LegacyRandom.ts`) |

### Villagers and units (`sim/units/`)

| File | What it does |
|---|---|
| `UnitRuntime.ts` | each step's update of the units |
| `LegacyEntityTargetStep.ts`, `LegacyEntityMoveTrigger.ts` | a step towards the target; taking a "go there" order |
| `LegacyEntityWorkDeposit.ts` | gathering and carrying things back to the store |
| `LegacyEntityHappiness.ts`, `LegacyEntityCourtship.ts`, `LegacyEntityHousing.ts` | mood; courtship and children; giving the homeless a hut |
| `LegacyEntitySkillGain.ts` | skills growing with work |
| `LegacyEntityStrikeGate.ts`, `LegacyEntityHealthDelta.ts` | one attack (hit and damage); health changes |
| `LegacyEntityEquipIssue.ts`, `LegacyEntityProduceItem.ts` | handing out weapons from the store; making weapons in the armoury |
| `LegacyEntityPlacement.ts`, `LegacyEntityResourceCost.ts` | placing buildings; building, upgrade and repair costs |
| `LegacyAnimalRoam.ts`, `LegacyAnimalHitReaction.ts` | animals wandering; animals fleeing or fighting back when hit |
| `LegacyEntityAbduction.ts` | enemies carrying children off with balloons |

### Tribes, enemies and story (`sim/tribe/`)

| File | What it does |
|---|---|
| `TribeRuntime.ts` | each step's update of the tribes; how far buildings may be upgraded |
| `LegacySubsystemBuildingEconomy.ts` | construction progress, completion, calling builders |
| `LegacySubsystemAs.ts`, `Av.ts`, `Aw.ts`, `At.ts` | when the next raid comes, who goes, marching to the gathering point, picking people and buildings to attack |
| `LegacySubsystemUnitTraining.ts` | enemy reinforcements and training |
| `LegacySubsystemBM.ts` | walking to the spot for form up and call to arms |
| `LegacySubsystemEntityRRoll.ts`, `LegacySubsystemEntityRegen.ts` | hunger and tiredness over time; healing |
| `LegacySubsystemAk.ts` | winning and losing |
| `LegacySubsystemAl.ts` | the tutorial's steps: waiting for the player to do each one |
| `LegacySubsystemV.ts`, `LegacySubsystemU.ts` | each mission's story script (U for mission 4) |

### Map and pathfinding (`sim/world/`)

| File | What it does |
|---|---|
| `WorldRuntime.ts` | loading the map, each step's update of the world; berries added to the custom maps |
| `LegacyMapRleDecoder.ts`, `LegacyTerrainAdjustment.ts` | unpacking the map data, adjusting the terrain |
| `LegacyPathE.ts`, `LegacyPathPreparation.ts`, `LegacyPathDirection.ts`, `LegacyPathCellPredicate.ts` | **pathfinding**: the search, its preparation, choosing a direction, which tiles can be walked |
| `LegacyNearestCandidateSearch.ts` | finding the nearest target (tree, stones, building…) |
| `LegacyFootprintCheck.ts`, `LegacyOccupancyClass.ts` | whether a building fits; a tile's fog and occupancy |
| `MapUpkeep.ts` | demolition timers, remembering buildings once seen |

### Drawing (`render/`)

| File | What it does |
|---|---|
| `PixiMap.ts` | the WebGL map: ground chunks, trees, stones and buildings, people and animals (sliding between steps), effects, fog, placement tiles, the selection frame |
| `MapScene.ts` | working out from the game state which people, marks and effects to draw now |
| `HdArt.ts` | finding HD pictures in the catalog, putting villagers together from their parts |
| `MapMargin.ts` | the border around the map |
| `LegacyCameraScroll.ts`, `LegacyCameraFollow.ts` | moving and following with the camera |
| `LegacyMapOverview.ts` | the mini map's colour for each tile |
| `RenderRuntime.ts`, `WideView.ts` | the parts of the original's drawing code still in use (the villager panel's numbers, the export tools) |

### Interface and controls (top of `web/src/`)

| File | What it does |
|---|---|
| `WideScreen.ts` | the screen and the view: where it looks, dragging, zooming, screen points to tiles |
| `TouchControls.ts` | touch and mouse: taps, drags, press-and-drag selection, turning gestures into game orders |
| `Hud.ts` | the in-game interface: top bar, build button and list, command button (call to arms, form up, villagers, mini map), building panel, villager panel, squads, placing buildings and flags, choosing a chief, game menu |
| `StartMenu.ts` | the start menu: campaign / custom, difficulty, maps, language, sound |
| `StoryHud.ts` | playing story and dialogue, the bottom dialogue box, villagers' replies, the win / lose and score pages |
| `story/StoryData.ts`, `story/StoryScenes.ts` | the original's dialogue numbers to story segment names; the scenes (cave animation, story pictures) |
| `Alerts.ts` | message bars (born, finished, under attack…), tap to jump to the place |
| `MiniMap.ts` | the mini map page |
| `Settings.ts`, `HelpCard.ts`, `MenuHud.ts` | the settings card, the help card, the buttons on the original's menu screens |
| `text/UiText.ts` | interface text in the current language (`ui("group.name")`) |
| `ui/` | the original's menu flow and commands (`LegacyStateMachine.ts` switches screens, `LegacyZAf.ts` and friends are the command bar's commands) |
| `save/` | saving and loading (`RmsGameplayRecord.ts` is the save format) |

## Reporting problems

Issues are welcome. Please include: phone or computer and browser, language, which mission, what you did, what you saw and what you expected; a screenshot helps.
