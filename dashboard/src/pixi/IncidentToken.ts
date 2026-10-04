import * as PIXI from 'pixi.js'

export type RouteType = 'known' | 'mid' | 'unknown' | 'default'

// Color palette per route
const ROUTE_COLORS: Record<RouteType, { core: number; glow: number; trail: number }> = {
  known:   { core: 0x4ade80, glow: 0x16a34a, trail: 0x4ade80 },
  mid:     { core: 0xfbbf24, glow: 0xd97706, trail: 0xfbbf24 },
  unknown: { core: 0xf87171, glow: 0xdc2626, trail: 0xf87171 },
  default: { core: 0x38bdf8, glow: 0x0284c7, trail: 0x38bdf8 },
}

interface TrailPoint {
  x: number
  y: number
  alpha: number
}

export class IncidentToken {
  public container: PIXI.Container
  private label: string
  private route: RouteType
  private colors: { core: number; glow: number; trail: number }

  // Rendering
  private tokenGraphic: PIXI.Graphics
  private labelText: PIXI.Text
  private glowGraphic: PIXI.Graphics
  private trailGraphics: PIXI.Graphics

  // Trail state
  private trailPoints: TrailPoint[] = []
  private readonly MAX_TRAIL = 16
  private tickerId: PIXI.Ticker | null = null

  // Pulse animation
  private pulsePhase: number = 0
  private isMoving: boolean = false
  private _destroyed: boolean = false

  constructor(label: string, route: RouteType = 'default') {
    this.label = label
    this.route = route
    this.colors = ROUTE_COLORS[route] ?? ROUTE_COLORS.default

    this.container = new PIXI.Container()
    this.container.zIndex = 100

    // --- Outer glow ring ---
    this.glowGraphic = new PIXI.Graphics()
    this.container.addChild(this.glowGraphic)

    // --- Trail ---
    this.trailGraphics = new PIXI.Graphics()
    this.container.addChildAt(this.trailGraphics, 0)

    // --- Core token (8×8 rotated square = diamond shape) ---
    this.tokenGraphic = new PIXI.Graphics()
    this.container.addChild(this.tokenGraphic)

    // --- Label ---
    this.labelText = new PIXI.Text({
      text: label.length > 10 ? label.substring(0, 10) : label,
      style: {
        fontFamily: 'Inter, monospace',
        fontSize: 5,
        fontWeight: '700',
        fill: 0xffffff,
      },
    })
    this.labelText.anchor.set(0.5, 0)
    this.labelText.y = 8
    this.container.addChild(this.labelText)

    this.drawToken(1.0)
    this.startPulse()
  }

  private drawToken(scale: number = 1.0) {
    this.tokenGraphic.clear()

    // Outer glow soft circle
    this.glowGraphic.clear()
    const glowR = 10 * scale
    this.glowGraphic.circle(0, 0, glowR)
    this.glowGraphic.fill({ color: this.colors.glow, alpha: 0.25 * scale })

    // Core diamond (rotated 45°)
    const s = 5 * scale
    this.tokenGraphic.poly([0, -s, s, 0, 0, s, -s, 0])
    this.tokenGraphic.fill({ color: this.colors.core, alpha: 1 })

    // Inner bright center
    const si = 2.5 * scale
    this.tokenGraphic.poly([0, -si, si, 0, 0, si, -si, 0])
    this.tokenGraphic.fill({ color: 0xffffff, alpha: 0.7 })

    // Outline stroke
    this.tokenGraphic.poly([0, -s, s, 0, 0, s, -s, 0])
    this.tokenGraphic.stroke({ color: this.colors.glow, width: 1 })
  }

  private startPulse() {
    // Use PIXI shared ticker for pulse animation
    this.tickerId = PIXI.Ticker.shared
    this.tickerId.add(this.onTick)
  }

  private onTick = (ticker: PIXI.Ticker) => {
    if (this._destroyed) return
    const dt = ticker.deltaTime
    this.pulsePhase += dt * 0.06
    const pulse = 0.85 + Math.sin(this.pulsePhase) * 0.15
    this.drawToken(pulse)

    // Rotate token slightly
    this.tokenGraphic.rotation += dt * 0.03

    // Fade trail points
    this.trailPoints = this.trailPoints
      .map(p => ({ ...p, alpha: p.alpha - dt * 0.05 }))
      .filter(p => p.alpha > 0)

    this.drawTrail()
  }

  private drawTrail() {
    this.trailGraphics.clear()
    this.trailPoints.forEach((p, i) => {
      const r = 3 * (i / this.trailPoints.length)
      const worldX = p.x - this.container.x
      const worldY = p.y - this.container.y
      this.trailGraphics.circle(worldX, worldY, r)
      this.trailGraphics.fill({ color: this.colors.trail, alpha: p.alpha * 0.6 })
    })
  }

  /**
   * Animate the token from (fromX, fromY) to (toX, toY) over durationMs.
   * Returns a Promise that resolves when the animation completes.
   */
  public moveTo(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    durationMs: number = 550
  ): Promise<void> {
    return new Promise(resolve => {
      this.container.x = fromX
      this.container.y = fromY
      this.isMoving = true

      const startTime = performance.now()

      const tick = () => {
        if (this._destroyed) { resolve(); return }
        const elapsed = performance.now() - startTime
        const t = Math.min(elapsed / durationMs, 1)

        // Ease-in-out cubic
        const eased = t < 0.5
          ? 4 * t * t * t
          : 1 - Math.pow(-2 * t + 2, 3) / 2

        this.container.x = fromX + (toX - fromX) * eased
        this.container.y = fromY + (toY - fromY) * eased

        // Add trail point in world space
        if (this.trailPoints.length < this.MAX_TRAIL) {
          this.trailPoints.push({ x: this.container.x, y: this.container.y, alpha: 0.8 })
        } else {
          this.trailPoints.shift()
          this.trailPoints.push({ x: this.container.x, y: this.container.y, alpha: 0.8 })
        }

        if (t < 1) {
          requestAnimationFrame(tick)
        } else {
          this.container.x = toX
          this.container.y = toY
          this.isMoving = false
          resolve()
        }
      }

      requestAnimationFrame(tick)
    })
  }

  public setRoute(route: RouteType) {
    this.route = route
    this.colors = ROUTE_COLORS[route] ?? ROUTE_COLORS.default
    this.drawToken(1.0)
  }

  public destroy() {
    this._destroyed = true
    if (this.tickerId) {
      this.tickerId.remove(this.onTick)
      this.tickerId = null
    }
    this.container.destroy({ children: true })
  }
}
