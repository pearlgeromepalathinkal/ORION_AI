/**
 * ORION-AI — Operations Floor Scene
 * 
 * Authentic, dense, professional software engineering & incident operations office:
 * - 10 Human Workstations + 1 Client Visitor:
 *   Elena (Incident Manager), Alex (Systems Eng - Network), Sam (Systems Eng - Server), Jordan (Systems Eng - DB),
 *   Taylor (Systems Eng - Cloud), Riley (Systems Eng - Security), Marcus (DevOps/SRE), Maya (QA Lead), Noah (QA), Ananya (Auto QA),
 *   and Client (External Customer).
 * - Dedicated Client Visiting Hall / Reception on the West Wing:
 *   Entrance door, reception counter desk, visitor seating, guest carpet, signage.
 * - Single clean nameplate per employee (NAME \n ROLE with status dot) that travels with them.
 * - No duplicate nameplates on human furniture desks.
 * - Top-level SpeechBubbleOverlay layer for crisp, reliable speech bubbles that track characters.
 * - Slower, natural distance-based walking movement.
 * - Physical Mail / Envelope handoff from Client to Manager.
 * - Active DevOps server racks with dynamic blinking LED arrays.
 */
import * as PIXI from 'pixi.js'
import { CharacterSprite, CharacterConfig, CharacterState } from './CharacterSprite'
import { IncidentToken, RouteType } from './IncidentToken'
import { ConfidenceRouter } from './ConfidenceRouter'
import { KnowledgeCounter } from './KnowledgeCounter'
import { SpeechBubbleOverlay, BubbleType } from './SpeechBubbleOverlay'

export type WorkstationState = 'idle' | 'processing' | 'success' | 'error'

export interface StationNode {
  id: string
  name: string
  role?: string
  x: number
  y: number
  type: 'human' | 'station'
  container?: PIXI.Container
  accentColor?: number
  w?: number
  stateIndicator?: PIXI.Graphics
}

// Coordinate anchors on 48x30 (768x480 px) grid
export const STATION_CENTERS: Record<string, { x: number; y: number }> = {
  // Command & AI Automation Hub (West Wing)
  commander:        { x: 88,  y: 84  },
  intake:           { x: 236, y: 64  },
  semantic:         { x: 324, y: 64  },
  knowledge_search: { x: 412, y: 64  },
  routing:          { x: 324, y: 140 },

  // Systems Engineering Wing Desks (Shared Human Response Pool - East Wing)
  engineer_alex:    { x: 520, y: 84  },
  engineer_sam:     { x: 590, y: 84  },
  engineer_jordan:  { x: 660, y: 84  },
  engineer_taylor:  { x: 520, y: 172 },
  engineer_riley:   { x: 590, y: 172 },

  // Compatibility aliases
  developer_david:  { x: 520, y: 84  },
  developer_priya:  { x: 590, y: 84  },
  developer_arjun:  { x: 660, y: 84  },
  developer_sofia:  { x: 520, y: 172 },
  developer_daniel: { x: 590, y: 172 },

  // DevOps / SRE Wing (South-West)
  devops_marcus:    { x: 88,  y: 280 },
  ai_diagnostics:   { x: 236, y: 250 },
  devops_infra:     { x: 160, y: 250 },

  // QA & Verification Lab (South-East)
  qa_maya:          { x: 480, y: 350 },
  qa_noah:          { x: 550, y: 350 },
  qa_ananya:        { x: 620, y: 350 },
  qa_testing:       { x: 410, y: 350 },

  // Resolution & Provenance Wing (South)
  playbook:         { x: 88,  y: 400 },
  verification:     { x: 200, y: 400 },
  resolution:       { x: 310, y: 400 },
  knowledge_lab:    { x: 680, y: 400 },

  // CLIENT VISITING HALL (Dedicated West Reception Area)
  client_entrance:  { x: 28,  y: 180 },
  client_reception: { x: 60,  y: 180 },
  reception_meet:   { x: 96,  y: 180 },
}

// Exactly 10 Human IT Operations Team Members + 1 Client Visitor
export const HUMAN_AGENTS: CharacterConfig[] = [
  // 1. COMMAND / MANAGEMENT — Incident Manager & HITL Authority
  {
    id: 'elena',
    name: 'Elena',
    role: 'Incident Manager',
    specialization: 'HITL Authority',
    spritesheetUrl: '/assets/characters/elena_16x16.png',
    accentColor: 0xd8b4fe, // pastel lavender
    x: 88,
    y: 104,
    deskId: 'commander',
  },
  // 2-6. SYSTEMS ENGINEERING — Shared Human Response Pool
  {
    id: 'alex',
    name: 'Alex',
    role: 'Systems Engineer',
    specialization: 'Network & Connectivity',
    spritesheetUrl: '/assets/characters/alex_16x16.png',
    accentColor: 0x7dd3fc, // pastel sky blue
    x: 520,
    y: 104,
    deskId: 'engineer_alex',
  },
  {
    id: 'sam',
    name: 'Sam',
    role: 'Systems Engineer',
    specialization: 'Server & OS',
    spritesheetUrl: '/assets/characters/sam_16x16.png',
    accentColor: 0xa5b4fc, // pastel periwinkle
    x: 590,
    y: 104,
    deskId: 'engineer_sam',
  },
  {
    id: 'jordan',
    name: 'Jordan',
    role: 'Systems Engineer',
    specialization: 'Database & Storage',
    spritesheetUrl: '/assets/characters/jordan_16x16.png',
    accentColor: 0xfcd34d, // pastel warm amber
    x: 660,
    y: 104,
    deskId: 'engineer_jordan',
  },
  {
    id: 'taylor',
    name: 'Taylor',
    role: 'Systems Engineer',
    specialization: 'Cloud & Infrastructure',
    spritesheetUrl: '/assets/characters/taylor_16x16.png',
    accentColor: 0x5eead4, // pastel mint
    x: 520,
    y: 192,
    deskId: 'engineer_taylor',
  },
  {
    id: 'riley',
    name: 'Riley',
    role: 'Systems Engineer',
    specialization: 'Identity & Security',
    spritesheetUrl: '/assets/characters/riley_16x16.png',
    accentColor: 0xfda4af, // pastel rose
    x: 590,
    y: 192,
    deskId: 'engineer_riley',
  },
  // 7. OPERATIONS / SRE
  {
    id: 'marcus',
    name: 'Marcus',
    role: 'DevOps / SRE Engineer',
    specialization: 'Production Reliability',
    spritesheetUrl: '/assets/characters/marcus_16x16.png',
    accentColor: 0xfca5a5, // pastel coral
    x: 88,
    y: 300,
    deskId: 'devops_marcus',
  },
  // 8-10. QA & VERIFICATION LAB
  {
    id: 'maya',
    name: 'Maya',
    role: 'QA Lead',
    specialization: 'Resolution Acceptance',
    spritesheetUrl: '/assets/characters/maya_16x16.png',
    accentColor: 0x6ee7b7, // pastel emerald
    x: 480,
    y: 370,
    deskId: 'qa_maya',
  },
  {
    id: 'noah',
    name: 'Noah',
    role: 'QA Engineer',
    specialization: 'Functional Validation',
    spritesheetUrl: '/assets/characters/noah_16x16.png',
    accentColor: 0xbef264, // pastel lime
    x: 550,
    y: 370,
    deskId: 'qa_noah',
  },
  {
    id: 'ananya',
    name: 'Ananya',
    role: 'Automation Engineer',
    specialization: 'Repeatable Validation',
    spritesheetUrl: '/assets/characters/ananya_16x16.png',
    accentColor: 0x67e8f9, // pastel cyan
    x: 620,
    y: 370,
    deskId: 'qa_ananya',
  },
  // 11. External Customer Visitor
  {
    id: 'client',
    name: 'Client',
    role: 'External Customer',
    specialization: 'Incident Reporter',
    spritesheetUrl: '/assets/characters/client_16x16.png',
    accentColor: 0xfde047, // pastel gold
    x: 60,
    y: 180,
    deskId: 'client_reception',
  },
]

export class FloorScene {
  private app: PIXI.Application | null = null
  private container: HTMLElement
  private viewportContainer: PIXI.Container = new PIXI.Container()
  private mapLayer:          PIXI.Container = new PIXI.Container()
  private routerLayer:       PIXI.Container = new PIXI.Container()
  private furnitureLayer:    PIXI.Container = new PIXI.Container()
  private characterLayer:    PIXI.Container = new PIXI.Container()
  private tokenLayer:        PIXI.Container = new PIXI.Container()
  private uiOverlayLayer:    PIXI.Container = new PIXI.Container()

  private nodes:      Map<string, StationNode> = new Map()
  private characters: Map<string, CharacterSprite> = new Map()

  private activeToken: IncidentToken | null = null
  private tokenRoute: RouteType = 'default'
  private lastTokenPos: { x: number; y: number } | null = null

  private confidenceRouter: ConfidenceRouter | null = null
  private kbCounter: KnowledgeCounter | null = null
  private speechOverlay: SpeechBubbleOverlay | null = null

  // DevOps Server Racks LEDs
  private devOpsLEDs: Array<{ graphic: PIXI.Graphics; x: number; y: number; baseColor: number; blinkPhase: number }> = []
  private isDevOpsHighActivity: boolean = false
  private frameCount: number = 0

  // Camera Pan & Zoom
  private isDragging: boolean = false
  private dragStartPos = { x: 0, y: 0 }
  private containerStartPos = { x: 0, y: 0 }
  private scaleLevel: number = 1.0

  private onSelectEntity?: (type: 'human' | 'station', id: string) => void

  constructor(container: HTMLElement, onSelectEntity?: (type: 'human' | 'station', id: string) => void) {
    this.container = container
    this.onSelectEntity = onSelectEntity
  }

  public async init() {
    const width = this.container.clientWidth || 900
    const height = this.container.clientHeight || 650

    this.app = new PIXI.Application()
    await this.app.init({
      width,
      height,
      backgroundColor: 0x140c11,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: false,
    })

    this.container.appendChild(this.app.canvas)
    PIXI.TextureSource.defaultOptions.scaleMode = 'nearest'

    this.app.stage.addChild(this.viewportContainer)
    this.viewportContainer.addChild(this.mapLayer)
    this.viewportContainer.addChild(this.routerLayer)
    this.viewportContainer.addChild(this.furnitureLayer)
    this.viewportContainer.addChild(this.characterLayer)
    this.viewportContainer.addChild(this.tokenLayer)
    this.viewportContainer.addChild(this.uiOverlayLayer)

    // Dedicated top-level Speech Bubble Overlay (guaranteed above all floor layers)
    this.speechOverlay = new SpeechBubbleOverlay(this.uiOverlayLayer)

    await this.loadTilesetTexturesAndBuild()
    await this.loadCharacters()

    this.confidenceRouter = new ConfidenceRouter(this.routerLayer)
    this.kbCounter = new KnowledgeCounter(this.uiOverlayLayer, 680, 360)

    this.autoFitToContainer(width, height)
    this.setupCameraPanAndZoom()

    // Scene animation loop
    this.app.ticker.add(() => {
      this.frameCount++
      this.speechOverlay?.update()
      this.updateDevOpsLEDs()
    })

    window.addEventListener('resize', this.handleResize)
  }

  public autoFitToContainer(containerW?: number, containerH?: number) {
    const w = containerW || this.container.clientWidth || 900
    const h = containerH || this.container.clientHeight || 650
    const floorW = 768
    const floorH = 480

    const scaleX = (w - 28) / floorW
    const scaleY = (h - 28) / floorH
    const fitScale = Math.max(0.68, Math.min(1.45, Math.min(scaleX, scaleY)))

    this.scaleLevel = fitScale
    this.viewportContainer.scale.set(this.scaleLevel)
    this.viewportContainer.x = Math.max(6, Math.round((w - floorW * fitScale) / 2))
    this.viewportContainer.y = Math.max(6, Math.round((h - floorH * fitScale) / 2))
  }

  private async loadTilesetTexturesAndBuild() {
    try {
      const roomAsset = await PIXI.Assets.load('/assets/environment/tiles/Room_Builder_16x16.png')
      const intAsset  = await PIXI.Assets.load('/assets/environment/Interiors_16x16.png')
      const rSrc = roomAsset.source || roomAsset
      const iSrc = intAsset.source  || intAsset

      const woodTex      = new PIXI.Texture({ source: rSrc, frame: new PIXI.Rectangle(0,  0, 16, 16) })
      const walkwayTex   = new PIXI.Texture({ source: rSrc, frame: new PIXI.Rectangle(16, 0, 16, 16) })
      const carpetTex    = new PIXI.Texture({ source: rSrc, frame: new PIXI.Rectangle(32, 0, 16, 16) })
      const wallTopTex   = new PIXI.Texture({ source: rSrc, frame: new PIXI.Rectangle(48, 0, 16, 16) })
      const wallFaceTex  = new PIXI.Texture({ source: rSrc, frame: new PIXI.Rectangle(64, 0, 16, 16) })
      const glassWallTex = new PIXI.Texture({ source: rSrc, frame: new PIXI.Rectangle(80, 0, 16, 16) })

      const deskLeftTex  = new PIXI.Texture({ source: iSrc, frame: new PIXI.Rectangle(0,   0, 16, 16) })
      const deskRightTex = new PIXI.Texture({ source: iSrc, frame: new PIXI.Rectangle(16,  0, 16, 16) })
      const monitorTex   = new PIXI.Texture({ source: iSrc, frame: new PIXI.Rectangle(32,  0, 16, 16) })
      const dualMonTex   = new PIXI.Texture({ source: iSrc, frame: new PIXI.Rectangle(48,  0, 16, 16) })
      const serverTex    = new PIXI.Texture({ source: iSrc, frame: new PIXI.Rectangle(64,  0, 16, 16) })
      const chairTex     = new PIXI.Texture({ source: iSrc, frame: new PIXI.Rectangle(80,  0, 16, 16) })
      const plantTex     = new PIXI.Texture({ source: iSrc, frame: new PIXI.Rectangle(96,  0, 16, 16) })
      const filingTex    = new PIXI.Texture({ source: iSrc, frame: new PIXI.Rectangle(144, 0, 16, 16) })
      const consoleTex   = new PIXI.Texture({ source: iSrc, frame: new PIXI.Rectangle(160, 0, 16, 16) })
      const whitebdTex   = new PIXI.Texture({ source: iSrc, frame: new PIXI.Rectangle(176, 0, 16, 16) })

      // Building shadow backdrop
      const shadow = new PIXI.Graphics()
      shadow.roundRect(-8, -8, 768 + 16, 480 + 16, 12)
      shadow.fill({ color: 0x020611, alpha: 0.9 })
      shadow.stroke({ color: 0x1e293b, width: 2 })
      this.mapLayer.addChild(shadow)

      // 1. TILEMAP: Primary Wood Floor + Walkway Corridors + Subtle Rugs
      const cols = 48, rows = 30, ts = 16
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let tex = woodTex

          // Perimeter walls
          if (r === 0 || c === 0 || c === cols - 1) tex = wallTopTex
          else if (r === rows - 1)                  tex = wallFaceTex
          // Central Horizontal Corridors (connecting East & West wings)
          else if (r >= 13 && r <= 14 && c >= 1 && c <= 46) tex = walkwayTex
          // Central Vertical Corridor (connecting North & South zones)
          else if (c >= 22 && c <= 24 && r >= 1 && r <= 28) tex = walkwayTex
          // Area rugs
          else if (c >= 3 && c <= 9 && r >= 3 && r <= 8)    tex = carpetTex // Command Rug
          else if (c >= 31 && c <= 45 && r >= 3 && r <= 12) tex = carpetTex // Dev Bay Rug
          else if (c >= 3 && c <= 10 && r >= 16 && r <= 21) tex = carpetTex // DevOps Rug
          else if (c >= 29 && c <= 43 && r >= 20 && r <= 25)tex = carpetTex // QA Rug
          // Dedicated Client Visiting Hall Rug (executive slate carpet)
          else if (c >= 1 && c <= 10 && r >= 10 && r <= 12) tex = carpetTex

          const s = new PIXI.Sprite(tex)
          s.x = c * ts
          s.y = r * ts
          this.mapLayer.addChild(s)
        }
      }

      // 2. CLIENT VISITING HALL RECEPTION VISUAL DETAILS
      // Visiting Hall Floor Border & Accent Glow
      const clientHallGlow = new PIXI.Graphics()
      clientHallGlow.roundRect(1 * ts, 9 * ts + 8, 10 * ts + 8, 3 * ts + 12, 6)
      clientHallGlow.fill({ color: 0x0f172a, alpha: 0.6 })
      clientHallGlow.stroke({ color: 0xf59e0b, width: 1.2, alpha: 0.6 })
      this.mapLayer.addChild(clientHallGlow)

      // Entrance Door on Left Wall
      const entranceDoor = new PIXI.Graphics()
      entranceDoor.rect(0, 10 * ts + 4, 6, 2 * ts + 8)
      entranceDoor.fill({ color: 0x38bdf8, alpha: 0.85 })
      entranceDoor.stroke({ color: 0x0284c7, width: 1.5 })
      this.furnitureLayer.addChild(entranceDoor)

      // Welcome Mat inside Entrance
      const welcomeMat = new PIXI.Graphics()
      welcomeMat.roundRect(8, 11 * ts - 2, 14, 20, 3)
      welcomeMat.fill({ color: 0x1e293b, alpha: 0.9 })
      welcomeMat.stroke({ color: 0xf59e0b, width: 1 })
      this.furnitureLayer.addChild(welcomeMat)

      const matTxt = new PIXI.Text({
        text: 'IN',
        style: { fontFamily: 'Inter, monospace', fontSize: 4.5, fontWeight: '800', fill: 0xfbbf24 }
      })
      matTxt.x = 12
      matTxt.y = 11 * ts + 3
      this.furnitureLayer.addChild(matTxt)

      // Reception Hall Signboard
      const hallSign = new PIXI.Graphics()
      hallSign.roundRect(28, 9 * ts + 10, 68, 12, 3)
      hallSign.fill({ color: 0x030712, alpha: 0.95 })
      hallSign.stroke({ color: 0xf59e0b, width: 1 })
      this.furnitureLayer.addChild(hallSign)

      const hallTxt = new PIXI.Text({
        text: 'VISITOR RECEPTION',
        style: { fontFamily: 'Inter, sans-serif', fontSize: 4.8, fontWeight: '800', fill: 0xfde68a, letterSpacing: 0.4 }
      })
      hallTxt.anchor.set(0.5, 0.5)
      hallTxt.x = 28 + 34
      hallTxt.y = 9 * ts + 16
      this.furnitureLayer.addChild(hallTxt)

      // Reception Counter Desk at (x: 48, y: 154)
      const recepDesk = new PIXI.Graphics()
      recepDesk.roundRect(46, 150, 40, 16, 3)
      recepDesk.fill({ color: 0x78350f, alpha: 0.95 })
      recepDesk.stroke({ color: 0xb45309, width: 1.2 })
      this.furnitureLayer.addChild(recepDesk)

      const recepMon = new PIXI.Sprite(monitorTex)
      recepMon.x = 52
      recepMon.y = 142
      this.furnitureLayer.addChild(recepMon)

      // Service Bell on Counter
      const bell = new PIXI.Graphics()
      bell.circle(76, 156, 2.5)
      bell.fill({ color: 0xfbbf24, alpha: 1 })
      bell.stroke({ color: 0xd97706, width: 0.8 })
      this.furnitureLayer.addChild(bell)

      // Visitor Lounge Chairs in Reception
      const vChairs = [
        { x: 104, y: 152 },
        { x: 122, y: 152 },
        { x: 140, y: 152 },
      ]
      vChairs.forEach(ch => {
        const cSpr = new PIXI.Sprite(chairTex)
        cSpr.x = ch.x
        cSpr.y = ch.y
        this.furnitureLayer.addChild(cSpr)
      })

      // Reception Coffee Table
      const coffeeTable = new PIXI.Graphics()
      coffeeTable.roundRect(110, 172, 28, 12, 3)
      coffeeTable.fill({ color: 0x451a03, alpha: 0.92 })
      coffeeTable.stroke({ color: 0x78350f, width: 1 })
      this.furnitureLayer.addChild(coffeeTable)

      // Reception Decorative Plants
      const rPlant = new PIXI.Sprite(plantTex)
      rPlant.x = 156
      rPlant.y = 148
      this.furnitureLayer.addChild(rPlant)

      // 3. ARCHITECTURAL PARTITIONS: Glass dividers & office zones
      // Doorway in Elena Office glass partition is at c: 6, c: 7 (x: 96 to 112)
      const glassWallCoords = [
        // Elena Office glass partition (with doorway at c: 6, 7)
        { c: 2, r: 9 }, { c: 3, r: 9 }, { c: 4, r: 9 }, { c: 5, r: 9 }, { c: 8, r: 9 }, { c: 9, r: 9 }, { c: 10, r: 9 },
        // DevOps / Marcus partition
        { c: 2, r: 22 }, { c: 3, r: 22 }, { c: 4, r: 22 }, { c: 7, r: 22 }, { c: 8, r: 22 }, { c: 9, r: 22 },
        // Development Bay glass border
        { c: 30, r: 13 }, { c: 31, r: 13 }, { c: 34, r: 13 }, { c: 35, r: 13 }, { c: 38, r: 13 }, { c: 39, r: 13 },
      ]
      glassWallCoords.forEach(p => {
        const gw = new PIXI.Sprite(glassWallTex)
        gw.x = p.c * ts
        gw.y = p.r * ts
        this.furnitureLayer.addChild(gw)
      })

      // Central Meeting Table & Chairs in the crossway courtyard
      const tableGraphic = new PIXI.Graphics()
      tableGraphic.roundRect(18 * ts + 2, 7 * ts + 2, 44, 28, 4)
      tableGraphic.fill({ color: 0xb45309, alpha: 0.95 })
      tableGraphic.stroke({ color: 0x78350f, width: 1.5 })
      this.furnitureLayer.addChild(tableGraphic)

      const mtChairs = [
        { x: 18 * ts + 8,  y: 7 * ts - 10 },
        { x: 18 * ts + 28, y: 7 * ts - 10 },
        { x: 18 * ts + 8,  y: 7 * ts + 32 },
        { x: 18 * ts + 28, y: 7 * ts + 32 },
      ]
      mtChairs.forEach(ch => {
        const cSprite = new PIXI.Sprite(chairTex)
        cSprite.x = ch.x
        cSprite.y = ch.y
        this.furnitureLayer.addChild(cSprite)
      })

      // 4. DEVOPS / SERVER RACKS WITH BLINKING LED ARRAYS
      const rackCoords = [
        { x: 18, y: 242 },
        { x: 18, y: 278 },
      ]
      rackCoords.forEach((rc, rIdx) => {
        const rackFrame = new PIXI.Graphics()
        rackFrame.roundRect(rc.x, rc.y, 22, 30, 2)
        rackFrame.fill({ color: 0x090d16, alpha: 0.98 })
        rackFrame.stroke({ color: 0x334155, width: 1.5 })
        this.furnitureLayer.addChild(rackFrame)

        // Glass server door sheen
        const doorSheen = new PIXI.Graphics()
        doorSheen.roundRect(rc.x + 2, rc.y + 2, 18, 26, 1)
        doorSheen.fill({ color: 0x38bdf8, alpha: 0.08 })
        doorSheen.stroke({ color: 0x0284c7, width: 0.8, alpha: 0.4 })
        this.furnitureLayer.addChild(doorSheen)

        // 3 Shelf units per rack
        for (let unit = 0; unit < 3; unit++) {
          const uY = rc.y + 4 + unit * 8
          const uLine = new PIXI.Graphics()
          uLine.rect(rc.x + 2, uY, 18, 6)
          uLine.fill({ color: 0x1e293b, alpha: 0.9 })
          this.furnitureLayer.addChild(uLine)

          // 3 LED dots per unit
          const ledColors = [0x4ade80, 0x38bdf8, 0xfbbf24]
          for (let l = 0; l < 3; l++) {
            const ledG = new PIXI.Graphics()
            const ledX = rc.x + 5 + l * 5
            const ledY = uY + 3
            ledG.circle(ledX, ledY, 1.3)
            ledG.fill({ color: ledColors[l], alpha: 0.9 })
            this.furnitureLayer.addChild(ledG)

            this.devOpsLEDs.push({
              graphic: ledG,
              x: ledX,
              y: ledY,
              baseColor: ledColors[l],
              blinkPhase: (rIdx * 9 + unit * 3 + l) * 0.4,
            })
          }
        }
      })

      // Extra decor: filing cabinets, whiteboards, plants
      const decorItems = [
        { tex: filingTex, x: 2 * ts,  y: 2 * ts },
        { tex: filingTex, x: 10 * ts, y: 2 * ts },
        { tex: filingTex, x: 46 * ts, y: 2 * ts },
        { tex: whitebdTex, x: 6 * ts,  y: 1 * ts + 4 },
        { tex: whitebdTex, x: 35 * ts, y: 1 * ts + 4 },
        { tex: whitebdTex, x: 40 * ts, y: 15 * ts + 4 },
        { tex: plantTex, x: 1 * ts + 4,  y: 6 * ts },
        { tex: plantTex, x: 11 * ts,     y: 6 * ts },
        { tex: plantTex, x: 17 * ts,     y: 1 * ts + 4 },
        { tex: plantTex, x: 26 * ts + 8, y: 1 * ts + 4 },
        { tex: plantTex, x: 46 * ts,     y: 11 * ts },
        { tex: plantTex, x: 1 * ts + 4,  y: 23 * ts },
        { tex: plantTex, x: 46 * ts,     y: 24 * ts },
      ]
      decorItems.forEach(item => {
        const spr = new PIXI.Sprite(item.tex)
        spr.x = item.x
        spr.y = item.y
        this.furnitureLayer.addChild(spr)
      })

      // ── BUILD 10 HUMAN WORKSTATIONS + SOFTWARE STATIONS ──
      const workstations = [
        // 1. COMMAND / MANAGEMENT — Incident Manager & HITL Authority
        { id: 'commander', name: 'ELENA', role: 'Incident Manager', type: 'human' as const, x: 60, y: 64, w: 56, accentColor: 0xd8b4fe, kind: 'desk' },

        // 2-6. SYSTEMS ENGINEERING — Shared Human Response Pool (East Wing)
        { id: 'engineer_alex',   name: 'ALEX',   role: 'Network & Connectivity',    type: 'human' as const, x: 496, y: 64,  w: 48, accentColor: 0x7dd3fc, kind: 'desk' },
        { id: 'engineer_sam',    name: 'SAM',    role: 'Server & OS',               type: 'human' as const, x: 566, y: 64,  w: 48, accentColor: 0xa5b4fc, kind: 'desk' },
        { id: 'engineer_jordan', name: 'JORDAN', role: 'Database & Storage',        type: 'human' as const, x: 636, y: 64,  w: 48, accentColor: 0xfcd34d, kind: 'desk' },
        { id: 'engineer_taylor', name: 'TAYLOR', role: 'Cloud & Infrastructure',    type: 'human' as const, x: 496, y: 152, w: 48, accentColor: 0x5eead4, kind: 'desk' },
        { id: 'engineer_riley',  name: 'RILEY',  role: 'Identity & Security',       type: 'human' as const, x: 566, y: 152, w: 48, accentColor: 0xfda4af, kind: 'desk' },

        // 7-9. QA & VERIFICATION LAB (South-East Wing)
        { id: 'qa_maya',   name: 'MAYA',   role: 'QA Lead',        type: 'human' as const, x: 456, y: 330, w: 48, accentColor: 0x6ee7b7, kind: 'desk' },
        { id: 'qa_noah',   name: 'NOAH',   role: 'QA Engineer',    type: 'human' as const, x: 526, y: 330, w: 48, accentColor: 0xbef264, kind: 'desk' },
        { id: 'qa_ananya', name: 'ANANYA', role: 'Automation Eng', type: 'human' as const, x: 596, y: 330, w: 48, accentColor: 0x67e8f9, kind: 'desk' },

        // 10. OPERATIONS / SRE (South-West Wing)
        { id: 'devops_marcus', name: 'MARCUS', role: 'DevOps / SRE', type: 'human' as const, x: 60, y: 260, w: 56, accentColor: 0xfca5a5, kind: 'sre_desk' },

        // Software Stations & Clusters (Official ORION-AI System Stations)
        { id: 'intake',           name: 'ORION INTAKE',        role: 'Ticket & Ingestion Gateway',  type: 'station' as const, x: 212, y: 44,  w: 52, accentColor: 0x7dd3fc, kind: 'intake_cluster' },
        { id: 'semantic',         name: 'INTENT ENGINE',       role: 'Intent & Scope Detection',    type: 'station' as const, x: 300, y: 44,  w: 52, accentColor: 0xc4b5fd, kind: 'console_cluster' },
        { id: 'knowledge_search', name: 'FEDERATED KB',        role: 'Confluence · SharePoint · Silos', type: 'station' as const, x: 388, y: 44,  w: 56, accentColor: 0x93c5fd, kind: 'console_cluster' },
        { id: 'routing',          name: 'RISK & ROUTING',      role: 'Resolve · Escalate · Clarify', type: 'station' as const, x: 296, y: 120, w: 58, accentColor: 0xfde68a, kind: 'routing_core' },

        // Diagnostic & SRE Telemetry Infrastructure
        { id: 'ai_diagnostics',   name: 'AI DIAGNOSTICS',      role: 'Evidence-Based RCA',          type: 'station' as const, x: 212, y: 230, w: 56, accentColor: 0xd8b4fe, kind: 'diagnostics_cluster' },
        { id: 'devops_infra',     name: 'SRE MONITOR',         role: 'Production Health & Telemetry', type: 'station' as const, x: 136, y: 230, w: 50, accentColor: 0xfbcfe8, kind: 'automation_cluster' },

        // QA Testing Workstation
        { id: 'qa_testing',       name: 'VERIFICATION LAB',   role: 'Closed-Loop Validation',      type: 'station' as const, x: 386, y: 330, w: 54, accentColor: 0x6ee7b7, kind: 'console_cluster' },

        // Resolution & Remediation Wing
        { id: 'playbook',         name: 'PLAYBOOK ENGINE',     role: 'Candidate Remediation Plans', type: 'station' as const, x: 60,  y: 380, w: 58, accentColor: 0x86efac, kind: 'automation_cluster' },
        { id: 'verification',     name: 'VERIFICATION ENGINE', role: 'Post-Remediation Verification', type: 'station' as const, x: 172, y: 380, w: 60, accentColor: 0x5eead4, kind: 'automation_cluster' },
        { id: 'resolution',       name: 'RESOLUTION ENGINE',   role: 'Final Incident Resolution',   type: 'station' as const, x: 282, y: 380, w: 58, accentColor: 0xa7f3d0, kind: 'automation_cluster' },
        { id: 'knowledge_lab',    name: 'PROVENANCE / AUDIT',  role: 'Immutable Resolution Trail',  type: 'station' as const, x: 652, y: 380, w: 60, accentColor: 0x99f6e4, kind: 'lab_cluster' },
      ]

      workstations.forEach(st => {
        const nodeC = new PIXI.Container()
        nodeC.x = st.x
        nodeC.y = st.y
        nodeC.eventMode = 'static'
        nodeC.cursor = 'pointer'

        if (st.kind === 'desk' || st.kind === 'sre_desk') {
          const dl = new PIXI.Sprite(deskLeftTex);  dl.x = 0;  dl.y = 12; nodeC.addChild(dl)
          const dr = new PIXI.Sprite(deskRightTex); dr.x = 16; dr.y = 12; nodeC.addChild(dr)
          if (st.w >= 48) { const de = new PIXI.Sprite(deskRightTex); de.x = 32; de.y = 12; nodeC.addChild(de) }

          const mon = new PIXI.Sprite(st.kind === 'sre_desk' || st.id.includes('alex') ? dualMonTex : monitorTex)
          mon.x = 8
          mon.y = 0
          nodeC.addChild(mon)

          const ch = new PIXI.Sprite(chairTex)
          ch.x = (st.w / 2) - 8
          ch.y = 28
          nodeC.addChild(ch)
        } else if (st.kind === 'intake_cluster') {
          const spawnPad = new PIXI.Graphics()
          spawnPad.roundRect(-4, -4, st.w + 8, 44, 6)
          spawnPad.fill({ color: 0x0284c7, alpha: 0.15 })
          spawnPad.stroke({ color: 0x38bdf8, width: 1.5, alpha: 0.8 })
          nodeC.addChild(spawnPad)

          const spawnTxt = new PIXI.Text({
            text: '◈ SPAWN',
            style: { fontFamily: 'Inter, monospace', fontSize: 5.5, fontWeight: '700', fill: 0x38bdf8 }
          })
          spawnTxt.x = 2
          spawnTxt.y = 28
          nodeC.addChild(spawnTxt)

          const dl = new PIXI.Sprite(deskLeftTex); dl.x = 0; dl.y = 8; nodeC.addChild(dl)
          const dr = new PIXI.Sprite(deskRightTex); dr.x = 16; dr.y = 8; nodeC.addChild(dr)
          const mon = new PIXI.Sprite(monitorTex); mon.x = 8; mon.y = -4; nodeC.addChild(mon)
          const s = new PIXI.Sprite(serverTex); s.x = 32; s.y = 6; nodeC.addChild(s)
        } else if (st.kind === 'routing_core') {
          const coreBase = new PIXI.Graphics()
          coreBase.roundRect(-4, -4, st.w + 8, 42, 6)
          coreBase.fill({ color: 0x78350f, alpha: 0.2 })
          coreBase.stroke({ color: 0xf59e0b, width: 1.5, alpha: 0.8 })
          nodeC.addChild(coreBase)

          const dl = new PIXI.Sprite(deskLeftTex); dl.x = 0; dl.y = 8; nodeC.addChild(dl)
          const dr = new PIXI.Sprite(deskRightTex); dr.x = 16; dr.y = 8; nodeC.addChild(dr)
          const mon = new PIXI.Sprite(dualMonTex); mon.x = 4; mon.y = -4; nodeC.addChild(mon)
          const s = new PIXI.Sprite(serverTex); s.x = 36; s.y = 6; nodeC.addChild(s)
        } else {
          const dl = new PIXI.Sprite(consoleTex); dl.x = 0; dl.y = 8; nodeC.addChild(dl)
          if (st.w >= 48) { const dr = new PIXI.Sprite(consoleTex); dr.x = 16; dr.y = 8; nodeC.addChild(dr) }
          const mon = new PIXI.Sprite(monitorTex); mon.x = 6; mon.y = -4; nodeC.addChild(mon)
          const s = new PIXI.Sprite(serverTex); s.x = st.w - 16; s.y = 6; nodeC.addChild(s)
        }

        let indicator: PIXI.Graphics | undefined

        // CRITICAL: ONLY render stationary badge nameplates on software systems (st.type === 'station').
        // Human workstations do NOT have static nameplates on desks; the human character carries their single clean identity label!
        if (st.type === 'station') {
          const plate = new PIXI.Graphics()
          plate.roundRect(0, -16, st.w, 13, 3)
          plate.fill({ color: 0x020617, alpha: 0.92 })
          plate.stroke({ color: st.accentColor, width: 1 })
          nodeC.addChild(plate)

          const nameTxt = new PIXI.Text({
            text: st.name,
            style: {
              fontFamily: 'Inter, sans-serif',
              fontSize: 6.5,
              fontWeight: '800',
              fill: 0xffffff,
            },
          })
          nameTxt.anchor.set(0.5, 0.5)
          nameTxt.x = st.w / 2
          nameTxt.y = -9.5
          nodeC.addChild(nameTxt)

          // Station State LED
          indicator = new PIXI.Graphics()
          indicator.circle(st.w - 5, -9.5, 2.5)
          indicator.fill({ color: 0x4ade80, alpha: 0.8 })
          indicator.label = 'state_dot'
          nodeC.addChild(indicator)
        }

        const ring = new PIXI.Graphics()
        ring.label = 'ring'
        nodeC.addChild(ring)

        nodeC.on('pointerdown', () => { if (this.onSelectEntity) this.onSelectEntity(st.type, st.id) })
        this.furnitureLayer.addChild(nodeC)
        this.nodes.set(st.id, {
          id: st.id,
          name: st.name,
          role: st.role,
          x: st.x,
          y: st.y,
          type: st.type,
          container: nodeC,
          accentColor: st.accentColor,
          w: st.w,
          stateIndicator: indicator,
        })
      })

      // Compatibility node aliases
      const alexNode = this.nodes.get('engineer_alex')
      if (alexNode) {
        this.nodes.set('developer_david', alexNode)
        this.nodes.set('developer', alexNode)
      }
      const samNode = this.nodes.get('engineer_sam')
      if (samNode) this.nodes.set('developer_priya', samNode)
      const jordanNode = this.nodes.get('engineer_jordan')
      if (jordanNode) this.nodes.set('developer_arjun', jordanNode)
      const taylorNode = this.nodes.get('engineer_taylor')
      if (taylorNode) this.nodes.set('developer_sofia', taylorNode)
      const rileyNode = this.nodes.get('engineer_riley')
      if (rileyNode) this.nodes.set('developer_daniel', rileyNode)
    } catch (err) {
      console.error('Error loading tilesets:', err)
    }
  }

  // ── 11 HUMANS (10 EMPLOYEES + 1 CLIENT) INITIALIZATION ──
  private async loadCharacters() {
    for (const cfg of HUMAN_AGENTS) {
      try {
        const tex = await PIXI.Assets.load(cfg.spritesheetUrl)
        const char = new CharacterSprite(cfg)
        if (this.speechOverlay) char.setSpeechOverlay(this.speechOverlay)
        await char.load(tex)

        char.container.on('pointerdown', () => {
          if (this.onSelectEntity) this.onSelectEntity('human', cfg.id)
        })

        this.characterLayer.addChild(char.container)
        this.characters.set(cfg.id, char)
        char.setState('idle')
        // Hide external client until an incident is reported
        if (cfg.id === 'client') {
          char.setVisible(false)
        }
      } catch (err) {
        console.warn(`Could not load character sprite for ${cfg.id}:`, err)
      }
    }
  }

  // ── SERVER RACKS BLINKING LEDS UPDATE LOOP ──
  private updateDevOpsLEDs() {
    if (this.devOpsLEDs.length === 0) return
    const speed = this.isDevOpsHighActivity ? 6 : 18

    this.devOpsLEDs.forEach((led, idx) => {
      const activeFrame = Math.floor((this.frameCount + idx * 4) / speed) % 2 === 0
      led.graphic.clear()
      led.graphic.circle(led.x, led.y, this.isDevOpsHighActivity ? 1.7 : 1.3)

      let color = led.baseColor
      if (this.isDevOpsHighActivity) {
        // High alert color cycle
        color = (idx % 3 === 0) ? 0xef4444 : (idx % 3 === 1) ? 0xfbbf24 : 0x38bdf8
      }

      led.graphic.fill({
        color,
        alpha: activeFrame ? 1.0 : (this.isDevOpsHighActivity ? 0.3 : 0.45)
      })
    })
  }

  public setDevOpsHighActivity(active: boolean) {
    this.isDevOpsHighActivity = active
  }

  // ── WORKSTATION STATE LED ──
  public setWorkstationState(stationId: string, state: WorkstationState) {
    const node = this.nodes.get(stationId)
    if (!node?.stateIndicator) return

    node.stateIndicator.clear()
    const colorMap: Record<WorkstationState, number> = {
      idle: 0x4ade80,
      processing: 0xfbbf24,
      success: 0x22c55e,
      error: 0xef4444,
    }
    const color = colorMap[state] || 0x4ade80
    node.stateIndicator.circle(node.w! - 5, -9.5, state === 'processing' ? 3.5 : 2.5)
    node.stateIndicator.fill({ color, alpha: 1 })
  }

  // ── PHYSICAL INCIDENT PACKET MOVEMENT ──
  public async animateIncidentTo(nodeId: string, label: string = 'INC', durationMs: number = 550) {
    const targetCenter = STATION_CENTERS[nodeId]
    if (!targetCenter) return

    if (!this.activeToken) {
      this.activeToken = new IncidentToken(label, this.tokenRoute)
      this.tokenLayer.addChild(this.activeToken.container)
      const start = STATION_CENTERS['intake'] ?? { x: 236, y: 64 }
      this.activeToken.container.x = start.x
      this.activeToken.container.y = start.y
      this.lastTokenPos = { ...start }
    }

    const from = this.lastTokenPos ?? { x: this.activeToken.container.x, y: this.activeToken.container.y }
    this.lastTokenPos = { ...targetCenter }

    this.setWorkstationState(nodeId, 'processing')
    this.flashStationRing(nodeId)
    await this.activeToken.moveTo(from.x, from.y, targetCenter.x, targetCenter.y, durationMs)
    this.setWorkstationState(nodeId, 'success')
  }

  private flashStationRing(nodeId: string) {
    const node = this.nodes.get(nodeId)
    if (!node?.container) return
    const ring = node.container.children.find(c => c.label === 'ring') as PIXI.Graphics | undefined
    if (!ring) return
    const stationW = node.w ?? 48
    let alpha = 1.0
    const fade = () => {
      alpha -= 0.04
      ring.clear()
      ring.circle(stationW / 2, 10, 26)
      ring.stroke({ color: node.accentColor ?? 0x38bdf8, width: 2, alpha })
      if (alpha > 0) requestAnimationFrame(fade)
    }
    requestAnimationFrame(fade)
  }

  public setTokenRoute(route: RouteType) {
    this.tokenRoute = route
    this.activeToken?.setRoute(route)
    if (route === 'known' || route === 'mid' || route === 'unknown') {
      this.confidenceRouter?.activateRoute(route)
    }
  }

  public clearToken() {
    if (this.activeToken) {
      this.tokenLayer.removeChild(this.activeToken.container)
      this.activeToken.destroy()
      this.activeToken = null
      this.lastTokenPos = null
    }
    this.confidenceRouter?.clearRoute()
    this.nodes.forEach((_, id) => this.setWorkstationState(id, 'idle'))
    this.setDevOpsHighActivity(false)
  }

  public captureKnowledge() {
    this.kbCounter?.increment(this.uiOverlayLayer)
  }

  public resetKbCounter() {
    this.kbCounter?.reset()
  }

  public resolveCharId(id: string): string {
    if (id === 'david') return 'alex'
    if (id === 'priya') return 'sam'
    if (id === 'arjun') return 'jordan'
    if (id === 'sofia') return 'taylor'
    if (id === 'daniel') return 'riley'
    return id
  }

  public getCharacter(id: string): CharacterSprite | undefined {
    return this.characters.get(this.resolveCharId(id))
  }

  // ── HUMAN ACTIONS & REALISTIC CORRIDOR WALKING ──
  public async walkCharacterToStation(charId: string, stationId: string, taskBubble?: string) {
    const resolvedId = this.resolveCharId(charId)
    const char = this.characters.get(resolvedId)
    if (!char || !char.container) return
    const dest = STATION_CENTERS[stationId]
    if (!dest) return

    const startX = char.container.x
    const startY = char.container.y

    // Dedicated hallway connection between Command and Client Visiting Hall
    if ((charId === 'elena' || charId === 'client') && (stationId === 'client_reception' || stationId === 'reception_meet' || stationId === 'commander')) {
      const waypoints = [
        { x: startX, y: startY < dest.y ? Math.min(dest.y, 144) : Math.max(dest.y, 144) },
        { x: dest.x, y: dest.y + (stationId === 'commander' ? 18 : 0) },
      ]
      char.setState('alerted')
      await new Promise(r => setTimeout(r, 200))
      if (!char.container) return
      await char.walkPath(waypoints)
      if (!char.container) return
      char.setState('idle')
      if (taskBubble) char.showBubble(taskBubble, 4000)
      return
    }

    // General office corridors:
    // Top corridor:    y = 216
    // Bottom corridor: y = 340
    // Vertical spine:  x = 420
    const TOP_CY    = 216
    const BOT_CY    = 340
    const SPINE_CX  = 420

    const nearestCorridor = (y: number) => {
      if (y < TOP_CY) return TOP_CY
      if (y > BOT_CY) return BOT_CY
      return Math.abs(y - TOP_CY) < Math.abs(y - BOT_CY) ? TOP_CY : BOT_CY
    }

    const srcCy = nearestCorridor(startY)
    const dstCy = nearestCorridor(dest.y)
    const waypoints: Array<{ x: number; y: number }> = []

    if (srcCy === dstCy) {
      waypoints.push({ x: startX, y: srcCy })
      waypoints.push({ x: dest.x,  y: srcCy })
    } else {
      waypoints.push({ x: startX,  y: srcCy  })
      waypoints.push({ x: SPINE_CX, y: srcCy  })
      waypoints.push({ x: SPINE_CX, y: dstCy  })
      waypoints.push({ x: dest.x,   y: dstCy  })
    }
    // Final approach
    waypoints.push({ x: dest.x, y: dest.y + 18 })

    char.setState('alerted')
    await new Promise(r => setTimeout(r, 200))
    if (!char.container) return
    await char.walkPath(waypoints)
    if (!char.container) return
    char.setState('working')
    if (taskBubble) char.showBubble(taskBubble, 4000)
  }

  /** Elena or any character walking directly to another character to speak */
  public async walkCharacterToCharacter(srcId: string, dstId: string, taskBubble?: string): Promise<void> {
    try {
      const src = this.getCharacter(srcId)
      const dst = this.getCharacter(dstId)
      if (!src || !dst || src.isDestroyed || dst.isDestroyed) return

      const srcX = src.x
      const srcY = src.y
      const dstX = dst.x
      const dstY = dst.y

      // Offset stopping point 26px to the left or right of the target person
      const targetX = dstX > srcX ? dstX - 26 : dstX + 26
      const targetY = dstY

      const TOP_CY    = 216
      const BOT_CY    = 340
      const SPINE_CX  = 420

      const waypoints: Array<{ x: number; y: number }> = []

      // If both are on the west side
      if (srcX < 200 && targetX < 200) {
        waypoints.push({ x: srcX, y: targetY })
        waypoints.push({ x: targetX, y: targetY })
      } else {
        const srcCy = srcY < TOP_CY ? TOP_CY : srcY > BOT_CY ? BOT_CY : TOP_CY
        const dstCy = targetY < TOP_CY ? TOP_CY : targetY > BOT_CY ? BOT_CY : TOP_CY

        if (srcCy === dstCy) {
          waypoints.push({ x: srcX, y: srcCy })
          waypoints.push({ x: targetX, y: srcCy })
        } else {
          waypoints.push({ x: srcX, y: srcCy })
          waypoints.push({ x: SPINE_CX, y: srcCy })
          waypoints.push({ x: SPINE_CX, y: dstCy })
          waypoints.push({ x: targetX, y: dstCy })
        }
        waypoints.push({ x: targetX, y: targetY })
      }

      src.setState('alerted')
      await new Promise(r => setTimeout(r, 150))
      if (src.isDestroyed || dst.isDestroyed) return
      await src.walkPath(waypoints)

      // Face each other safely
      if (src.isDestroyed || dst.isDestroyed) return
      src.faceTarget(dst.x)
      dst.faceTarget(src.x)
      src.setState('talking')

      if (taskBubble) src.showBubble(taskBubble, 4000)
    } catch {
      // Safe fallback
    }
  }

  public async returnCharacterHome(charId: string) {
    const char = this.getCharacter(charId)
    if (!char || !char.container) return
    char.hideBubble()

    const startX = char.container.x
    const startY = char.container.y

    // Special return for Elena from Reception
    if (charId === 'elena' && startX < 150 && startY < 230) {
      const waypoints = [
        { x: 96, y: 144 },
        { x: char.homeX, y: char.homeY }
      ]
      await char.walkPath(waypoints)
      if (!char.container) return
      char.faceTarget(char.homeX + 10)
      char.setState('idle')
      return
    }

    // Special return for Client to Reception chair
    if (charId === 'client') {
      await char.walkPath([{ x: char.homeX, y: char.homeY }])
      if (!char.container) return
      char.faceTarget(char.homeX + 10)
      char.setState('idle')
      return
    }

    const TOP_CY    = 216
    const BOT_CY    = 340
    const SPINE_CX  = 420

    const nearestCorridor = (y: number) => {
      if (y < TOP_CY) return TOP_CY
      if (y > BOT_CY) return BOT_CY
      return Math.abs(y - TOP_CY) < Math.abs(y - BOT_CY) ? TOP_CY : BOT_CY
    }

    const srcCy = nearestCorridor(startY)
    const dstCy = nearestCorridor(char.homeY)
    const waypoints: Array<{ x: number; y: number }> = []

    if (srcCy === dstCy) {
      waypoints.push({ x: startX,    y: srcCy })
      waypoints.push({ x: char.homeX, y: srcCy })
    } else {
      waypoints.push({ x: startX,    y: srcCy  })
      waypoints.push({ x: SPINE_CX,  y: srcCy  })
      waypoints.push({ x: SPINE_CX,  y: dstCy  })
      waypoints.push({ x: char.homeX, y: dstCy  })
    }
    waypoints.push({ x: char.homeX, y: char.homeY })

    await char.walkPath(waypoints)
    if (!char.container) return
    char.faceTarget(char.homeX + 10)
    char.setState('idle')
  }

  public setCharacterState(id: string, state: CharacterState) {
    this.getCharacter(id)?.setState(state)
  }

  public showCharacterBubble(id: string, text: string, durationMs: number = 3800, type?: BubbleType) {
    const char = this.getCharacter(id)
    if (char) {
      char.showBubble(text, durationMs, type ?? 'message')
    }
  }

  /** Client arrives from entrance to reception desk with dynamic identity */
  public async clientArrive(name?: string, role?: string): Promise<void> {
    const client = this.characters.get('client')
    if (!client) return
    client.setVisible(true)
    if (name && role) {
      client.updateIdentity(name, role)
    }
    if (client.container) {
      client.container.x = 28
      client.container.y = 180
    }
    client.faceTarget(60)
    await client.walkTo(60, 180)
    client.faceTarget(96)
    client.setState('waiting')
  }

  /** Client confirms resolution, thanks the team, and walks out the entrance */
  public async clientExit(): Promise<void> {
    const client = this.characters.get('client')
    if (!client || !client.container) return
    client.faceTarget(28)
    client.showBubble('Resolution confirmed! Thank you team.', 2600, 'success')
    await client.walkTo(28, 180)
    client.setVisible(false)
    client.setState('idle')
    client.hideBubble()
  }

  /** Immediately hide client and reset to entrance on reset/standby */
  public hideClientImmediate(): void {
    const client = this.characters.get('client')
    if (!client || !client.container) return
    client.setVisible(false)
    client.hideBubble()
    client.setState('idle')
    client.container.x = 28
    client.container.y = 180
  }

  /** Animate physical mail envelope from Client to Manager in Reception */
  public async sendClientMail(): Promise<void> {
    const client = this.characters.get('client')
    const elena  = this.characters.get('elena')

    const startX = client ? client.x : 60
    const startY = (client ? client.y : 180) - 28
    const endX   = elena ? elena.x : 96
    const endY   = (elena ? elena.y : 180) - 20

    const mail = new PIXI.Container()

    // Shadow
    const mShadow = new PIXI.Graphics()
    mShadow.roundRect(1, 2, 14, 10, 2)
    mShadow.fill({ color: 0x000000, alpha: 0.35 })
    mail.addChild(mShadow)

    // Envelope body
    const body = new PIXI.Graphics()
    body.roundRect(0, 0, 14, 10, 2)
    body.fill({ color: 0xfef3c7, alpha: 1 })
    body.stroke({ color: 0xf59e0b, width: 1.2 })

    // Envelope flap
    const flap = new PIXI.Graphics()
    flap.moveTo(0, 0)
    flap.lineTo(7, 5.5)
    flap.lineTo(14, 0)
    flap.fill({ color: 0xfde68a, alpha: 1 })

    // Wax seal
    const seal = new PIXI.Graphics()
    seal.circle(7, 5.5, 2)
    seal.fill({ color: 0xef4444, alpha: 1 })

    mail.addChild(body)
    mail.addChild(flap)
    mail.addChild(seal)

    // Glow aura
    const glow = new PIXI.Graphics()
    glow.circle(7, 5, 12)
    glow.fill({ color: 0xf59e0b, alpha: 0.25 })
    mail.addChildAt(glow, 0)

    mail.x = startX
    mail.y = startY

    this.uiOverlayLayer.addChild(mail)

    const totalMs = 1200
    const startTime = performance.now()

    await new Promise<void>(resolve => {
      const animate = () => {
        const elapsed = performance.now() - startTime
        const t = Math.min(elapsed / totalMs, 1)
        // Smooth ease-in-out
        const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t

        mail.x = startX + (endX - startX) * eased
        // Parabolic flying arc
        mail.y = startY + (endY - startY) * eased - Math.sin(t * Math.PI) * 18

        mail.alpha = t < 0.1 ? t * 10 : t > 0.88 ? (1 - t) / 0.12 : 1

        if (t < 1) requestAnimationFrame(animate)
        else {
          this.uiOverlayLayer.removeChild(mail)
          mail.destroy({ children: true })
          resolve()
        }
      }
      requestAnimationFrame(animate)
    })
  }

  /** Notification badge above Elena after receiving mail */
  public showMailNotification(title: string, incidentId: string, severity: string) {
    const n = new PIXI.Container()
    const elena = this.characters.get('elena')
    n.x = (elena ? elena.x : 88) - 44
    n.y = (elena ? elena.y : 104) - 72

    const bg = new PIXI.Graphics()
    bg.roundRect(0, 0, 92, 38, 5)
    bg.fill({ color: 0x020617, alpha: 0.97 })
    bg.stroke({ color: 0xf59e0b, width: 1.5 })

    const head = new PIXI.Text({ text: '✉ NEW INCIDENT', style: { fontFamily: 'Inter, monospace', fontSize: 4.8, fontWeight: '800', fill: 0xfbbf24 } })
    head.x = 6; head.y = 5

    const sevBadge = new PIXI.Graphics()
    sevBadge.roundRect(6, 14, 16, 8, 2)
    sevBadge.fill({ color: severity === 'P1' ? 0xef4444 : 0xf59e0b, alpha: 1 })

    const sevTxt = new PIXI.Text({ text: severity, style: { fontFamily: 'Inter, monospace', fontSize: 4.5, fontWeight: '800', fill: 0xffffff } })
    sevTxt.x = 9; sevTxt.y = 15.5

    const idTxt = new PIXI.Text({ text: incidentId, style: { fontFamily: 'Inter, monospace', fontSize: 4.2, fontWeight: '700', fill: 0x94a3b8 } })
    idTxt.x = 26; idTxt.y = 15.5

    const titleTxt = new PIXI.Text({ text: title.slice(0, 26), style: { fontFamily: 'Inter, sans-serif', fontSize: 4.2, fontWeight: '600', fill: 0xe2e8f0 } })
    titleTxt.x = 6; titleTxt.y = 26

    n.addChild(bg)
    n.addChild(head)
    n.addChild(sevBadge)
    n.addChild(sevTxt)
    n.addChild(idTxt)
    n.addChild(titleTxt)
    this.uiOverlayLayer.addChild(n)

    let alpha = 0
    const fadeIn = () => {
      alpha = Math.min(alpha + 0.1, 1)
      n.alpha = alpha
      if (alpha < 1) requestAnimationFrame(fadeIn)
    }
    requestAnimationFrame(fadeIn)

    setTimeout(() => {
      let a = 1
      const fadeOut = () => {
        a -= 0.05
        n.alpha = Math.max(a, 0)
        if (a > 0) requestAnimationFrame(fadeOut)
        else {
          try {
            this.uiOverlayLayer.removeChild(n)
            n.destroy({ children: true })
          } catch {
            // Safe cleanup
          }
        }
      }
      requestAnimationFrame(fadeOut)
    }, 3800)
  }

  private setupCameraPanAndZoom() {
    if (!this.app) return
    const canvas = this.app.canvas

    canvas.addEventListener('mousedown', (e: MouseEvent) => {
      this.isDragging = true
      this.dragStartPos = { x: e.clientX, y: e.clientY }
      this.containerStartPos = { x: this.viewportContainer.x, y: this.viewportContainer.y }
    })
    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isDragging) return
      this.viewportContainer.x = this.containerStartPos.x + (e.clientX - this.dragStartPos.x)
      this.viewportContainer.y = this.containerStartPos.y + (e.clientY - this.dragStartPos.y)
    })
    window.addEventListener('mouseup', () => { this.isDragging = false })

    canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault()
      const newScale = Math.max(0.6, Math.min(2.5, this.scaleLevel * (e.deltaY < 0 ? 1.1 : 0.9)))
      this.scaleLevel = newScale
      this.viewportContainer.scale.set(this.scaleLevel)
    })
  }

  private handleResize = () => {
    if (!this.app || !this.container) return
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    if (width > 0 && height > 0) {
      this.app.renderer.resize(width, height)
      this.autoFitToContainer(width, height)
    }
  }

  public destroy() {
    window.removeEventListener('resize', this.handleResize)
    this.clearToken()
    this.confidenceRouter?.destroy()
    this.kbCounter?.destroy()
    this.speechOverlay?.destroy()
    this.characters.forEach(c => c.destroy())
    this.characters.clear()
    if (this.app) {
      try {
        this.app.destroy({ removeView: true })
      } catch {
        // Safe cleanup
      }
      this.app = null
    }
  }
}
