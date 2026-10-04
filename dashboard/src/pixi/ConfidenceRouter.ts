/**
 * Prompt 4: Confidence Routing Visual Layer
 * 
 * Renders 3 branch paths on the floor from the Routing Engine to:
 *   - Known (0.94+) → Playbook Engine (green path)
 *   - Mid  (0.55-0.84) → Developer desk (amber path)
 *   - Unknown (<0.55) → AI Diagnostics (red path)
 * 
 * When a route fires, the corresponding path lights up with a traveling
 * dashed beam animation.
 */
import * as PIXI from 'pixi.js'

type Route = 'known' | 'mid' | 'unknown'

interface RoutePathDef {
  from: { x: number; y: number }
  to: { x: number; y: number }
  color: number
  label: string
  threshold: string
}

const PATHS: Record<Route, RoutePathDef> = {
  known: {
    from: { x: 352, y: 136 },  // Routing Engine center
    to:   { x: 96,  y: 354 },  // Playbook Engine
    color: 0x4ade80,
    label: 'KNOWN ≥0.85',
    threshold: '≥ 0.85',
  },
  mid: {
    from: { x: 352, y: 136 },
    to:   { x: 572, y: 88  },  // Developer desk
    color: 0xfbbf24,
    label: 'MID 0.65-0.84',
    threshold: '0.65–0.84',
  },
  unknown: {
    from: { x: 352, y: 136 },
    to:   { x: 272, y: 244 },  // AI Diagnostics
    color: 0xf87171,
    label: 'UNKNOWN <0.65',
    threshold: '< 0.65',
  },
}

export class ConfidenceRouter {
  private container: PIXI.Container
  private pathGraphics: PIXI.Graphics
  private activeRoute: Route | null = null
  private beamPhase: number = 0
  private tickerRef: PIXI.Ticker

  constructor(parent: PIXI.Container) {
    this.container = new PIXI.Container()
    this.pathGraphics = new PIXI.Graphics()
    this.container.addChild(this.pathGraphics)
    parent.addChild(this.container)

    this.tickerRef = PIXI.Ticker.shared
    this.tickerRef.add(this.onTick)

    // Draw dim base paths (always visible as guidance)
    this.drawBasePaths()
  }

  private drawBasePaths() {
    this.pathGraphics.clear()
    Object.entries(PATHS).forEach(([, def]) => {
      this.pathGraphics.moveTo(def.from.x, def.from.y)
      this.pathGraphics.lineTo(def.to.x, def.to.y)
      this.pathGraphics.stroke({ color: def.color, width: 1, alpha: 0.12 })
    })
  }

  private onTick = (ticker: PIXI.Ticker) => {
    if (!this.activeRoute) return
    this.beamPhase += ticker.deltaTime * 0.04

    const def = PATHS[this.activeRoute]
    this.pathGraphics.clear()

    // Dim inactive paths
    Object.entries(PATHS).forEach(([key, d]) => {
      if (key === this.activeRoute) return
      this.pathGraphics.moveTo(d.from.x, d.from.y)
      this.pathGraphics.lineTo(d.to.x, d.to.y)
      this.pathGraphics.stroke({ color: d.color, width: 1, alpha: 0.1 })
    })

    // Active path: pulsing dashed beam
    const dx = def.to.x - def.from.x
    const dy = def.to.y - def.from.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const steps = Math.floor(dist / 6)
    const pulse = 0.6 + Math.sin(this.beamPhase * Math.PI * 2) * 0.4

    for (let i = 0; i < steps; i++) {
      const t0 = ((i / steps) + this.beamPhase) % 1
      const t1 = (((i + 0.5) / steps) + this.beamPhase) % 1

      const x0 = def.from.x + dx * t0
      const y0 = def.from.y + dy * t0
      const x1 = def.from.x + dx * t1
      const y1 = def.from.y + dy * t1

      const segAlpha = i % 2 === 0 ? pulse : 0.0
      this.pathGraphics.moveTo(x0, y0)
      this.pathGraphics.lineTo(x1, y1)
      this.pathGraphics.stroke({ color: def.color, width: 2.5, alpha: segAlpha })
    }

    // Endpoint glow
    this.pathGraphics.circle(def.to.x, def.to.y, 6)
    this.pathGraphics.fill({ color: def.color, alpha: pulse * 0.5 })
    this.pathGraphics.circle(def.to.x, def.to.y, 3)
    this.pathGraphics.fill({ color: 0xffffff, alpha: pulse * 0.8 })
  }

  public activateRoute(route: Route) {
    this.activeRoute = route
    this.beamPhase = 0
  }

  public clearRoute() {
    this.activeRoute = null
    this.drawBasePaths()
  }

  public destroy() {
    this.tickerRef.remove(this.onTick)
    this.container.destroy({ children: true })
  }
}
