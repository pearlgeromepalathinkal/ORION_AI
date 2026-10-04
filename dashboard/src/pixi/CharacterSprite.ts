import * as PIXI from 'pixi.js'
import type { SpeechBubbleOverlay, BubbleType } from './SpeechBubbleOverlay'

export type CharacterState =
  | 'idle'
  | 'alerted'
  | 'standing'
  | 'entering'
  | 'walking'
  | 'working'
  | 'talking'
  | 'waiting'
  | 'handing_over'
  | 'reviewing'
  | 'investigating'
  | 'approved'
  | 'success'
  | 'returning'

export interface CharacterConfig {
  id: string
  name: string
  role: string
  specialization?: string
  spritesheetUrl: string
  accentColor: number
  x: number
  y: number
  deskId?: string
}

const FRAME_WIDTH = 16
const FRAME_HEIGHT = 16
const IDLE_FRAMES = 4
const WORK_FRAMES = 4
const IDLE_ROW = 0
const WORK_ROW = 1

// Natural walking speed in pixels per second (~40-60% of original speed)
const WALK_SPEED_PX_PER_SEC = 50

export class CharacterSprite {
  public container: PIXI.Container
  public id: string
  public config: CharacterConfig
  public homeX: number
  public homeY: number

  private sprite: PIXI.AnimatedSprite | null = null
  private idleTextures: PIXI.Texture[] = []
  private workTextures: PIXI.Texture[] = []
  private state: CharacterState = 'idle'
  private nameTag: PIXI.Container
  private statusDot: PIXI.Graphics | null = null
  private dotX: number = 0
  private dotY: number = 0
  private _destroyed: boolean = false
  private speechOverlay: SpeechBubbleOverlay | null = null

  constructor(config: CharacterConfig) {
    this.id = config.id
    this.config = config
    this.homeX = config.x
    this.homeY = config.y
    this.container = new PIXI.Container()
    this.container.x = config.x
    this.container.y = config.y
    this.container.eventMode = 'static'
    this.container.cursor = 'pointer'
    this.nameTag = new PIXI.Container()
  }

  public setSpeechOverlay(overlay: SpeechBubbleOverlay) {
    this.speechOverlay = overlay
  }

  public async load(texture: PIXI.Texture) {
    const src = texture.source

    for (let f = 0; f < IDLE_FRAMES; f++) {
      const t = new PIXI.Texture({
        source: src,
        frame: new PIXI.Rectangle(f * FRAME_WIDTH, IDLE_ROW * FRAME_HEIGHT, FRAME_WIDTH, FRAME_HEIGHT),
      })
      this.idleTextures.push(t)
    }

    for (let f = 0; f < WORK_FRAMES; f++) {
      const t = new PIXI.Texture({
        source: src,
        frame: new PIXI.Rectangle(f * FRAME_WIDTH, WORK_ROW * FRAME_HEIGHT, FRAME_WIDTH, FRAME_HEIGHT),
      })
      this.workTextures.push(t)
    }

    this.sprite = new PIXI.AnimatedSprite(this.idleTextures)
    this.sprite.animationSpeed = 0.04
    this.sprite.loop = true
    this.sprite.play()
    this.sprite.anchor.set(0.5, 1.0)
    this.sprite.x = 0
    this.sprite.y = 0
    this.sprite.scale.set(1.8)

    this.container.addChild(this.sprite)

    // Vibrant accent glow at character feet
    const glow = new PIXI.Graphics()
    glow.ellipse(0, -1, 11, 4)
    glow.fill({ color: this.config.accentColor, alpha: 0.35 })
    this.container.addChildAt(glow, 0)

    this.buildNameTag()
    this.container.addChild(this.nameTag)
  }

  /** Single clean identity nameplate: NAME \n ROLE with status dot */
  private buildNameTag() {
    this.nameTag.removeChildren()

    const paddingX = 4
    const paddingY = 2

    const nameTxt = new PIXI.Text({
      text: this.config.name.toUpperCase(),
      style: {
        fontFamily: 'Inter, sans-serif',
        fontSize: 6.5,
        fontWeight: '800',
        fill: 0xffffff,
        letterSpacing: 0.3,
      },
    })

    const roleTxt = new PIXI.Text({
      text: this.config.role,
      style: {
        fontFamily: 'Inter, sans-serif',
        fontSize: 4.8,
        fontWeight: '600',
        fill: 0xe2e8f0,
      },
    })

    const specTxt = this.config.specialization
      ? new PIXI.Text({
          text: this.config.specialization,
          style: {
            fontFamily: 'Inter, sans-serif',
            fontSize: 4.2,
            fontWeight: '500',
            fill: 0x94a3b8,
          },
        })
      : null

    const contentW = Math.max(nameTxt.width, roleTxt.width, specTxt ? specTxt.width : 0)
    const plateW = contentW + paddingX * 2 + 8
    const specH = specTxt ? specTxt.height : 0
    const plateH = nameTxt.height + roleTxt.height + specH + paddingY * 2

    const bg = new PIXI.Graphics()
    bg.roundRect(-plateW / 2, 0, plateW, plateH, 3)
    bg.fill({ color: 0x030712, alpha: 0.94 })
    bg.stroke({ color: this.config.accentColor, width: 1.0 })

    nameTxt.x = -plateW / 2 + paddingX + 7
    nameTxt.y = paddingY

    roleTxt.x = -plateW / 2 + paddingX + 7
    roleTxt.y = paddingY + nameTxt.height

    if (specTxt) {
      specTxt.x = -plateW / 2 + paddingX + 7
      specTxt.y = paddingY + nameTxt.height + roleTxt.height
    }

    this.dotX = -plateW / 2 + paddingX + 3
    this.dotY = nameTxt.y + nameTxt.height / 2

    this.statusDot = new PIXI.Graphics()
    this.statusDot.circle(this.dotX, this.dotY, 2)
    this.statusDot.fill({ color: 0x4ade80, alpha: 1 })

    this.nameTag.addChild(bg)
    this.nameTag.addChild(nameTxt)
    this.nameTag.addChild(roleTxt)
    if (specTxt) this.nameTag.addChild(specTxt)
    this.nameTag.addChild(this.statusDot)

    this.nameTag.y = -(FRAME_HEIGHT * 1.8 + plateH + 2)
    this.nameTag.x = 0
  }

  public updateIdentity(name: string, role: string, specialization?: string) {
    this.config.name = name
    this.config.role = role
    if (specialization !== undefined) this.config.specialization = specialization
    this.buildNameTag()
  }

  public setVisible(visible: boolean) {
    if (this.container && !this.isDestroyed) {
      this.container.visible = visible
    }
  }

  public setState(newState: CharacterState) {
    if (!this.sprite) return
    this.state = newState

    switch (newState) {
      case 'idle':
        this.sprite.textures = this.idleTextures
        this.sprite.animationSpeed = 0.04
        this.sprite.play()
        this.setStatusDotColor(0x4ade80) // Green
        break
      case 'entering':
      case 'walking':
      case 'returning':
        this.sprite.textures = this.idleTextures
        this.sprite.animationSpeed = 0.08 // Matched to natural slower walking velocity
        this.sprite.play()
        this.setStatusDotColor(0x38bdf8) // Blue
        break
      case 'alerted':
        this.sprite.textures = this.workTextures
        this.sprite.animationSpeed = 0.16
        this.sprite.play()
        this.setStatusDotColor(0xef4444) // Red alert
        break
      case 'standing':
      case 'waiting':
        this.sprite.textures = this.idleTextures
        this.sprite.animationSpeed = 0.03
        this.sprite.play()
        this.setStatusDotColor(0xfbbf24) // Amber
        break
      case 'working':
        this.sprite.textures = this.workTextures
        this.sprite.animationSpeed = 0.10
        this.sprite.play()
        this.setStatusDotColor(0xfbbf24) // Amber
        break
      case 'talking':
      case 'handing_over':
        this.sprite.textures = this.workTextures
        this.sprite.animationSpeed = 0.12
        this.sprite.play()
        this.setStatusDotColor(0x38bdf8) // Cyan
        break
      case 'reviewing':
      case 'investigating':
        this.sprite.textures = this.workTextures
        this.sprite.animationSpeed = 0.08
        this.sprite.play()
        this.setStatusDotColor(0xc084fc) // Purple
        break
      case 'approved':
      case 'success':
        this.sprite.textures = this.workTextures
        this.sprite.animationSpeed = 0.10
        this.sprite.play()
        this.setStatusDotColor(0x22c55e) // Emerald
        break
    }
  }

  private setStatusDotColor(color: number) {
    if (this._destroyed || !this.statusDot) return
    try {
      if (typeof this.statusDot.clear === 'function') {
        this.statusDot.clear()
        this.statusDot.circle(this.dotX, this.dotY, 2)
        this.statusDot.fill({ color, alpha: 1 })
      }
    } catch {
      // Safe fallback if graphics context was destroyed or detached
    }
  }

  public get isDestroyed(): boolean {
    return this._destroyed || !this.container || Boolean(this.container.destroyed)
  }

  public get x(): number {
    if (this.isDestroyed) return this.homeX
    try {
      return this.container?.x ?? this.homeX
    } catch {
      return this.homeX
    }
  }

  public get y(): number {
    if (this.isDestroyed) return this.homeY
    try {
      return this.container?.y ?? this.homeY
    } catch {
      return this.homeY
    }
  }

  public faceTarget(targetX: number) {
    if (this.isDestroyed || !this.sprite) return
    try {
      const curX = this.x
      this.sprite.scale.x = targetX < curX ? -1.8 : 1.8
    } catch {
      // Safe fallback
    }
  }

  /** Rich contextual Task/Speech bubble above character head */
  public showBubble(text: string, durationMs: number = 3800, type: BubbleType = 'message') {
    if (this.isDestroyed) return
    if (this.speechOverlay) {
      this.speechOverlay.showBubble(this.id, this, text, durationMs, type)
    }
  }

  public hideBubble() {
    if (this.speechOverlay) {
      this.speechOverlay.hideBubble(this.id)
    }
  }

  /** Walk through multiple waypoints (corridors) avoiding obstacles with natural velocity */
  public async walkPath(waypoints: Array<{ x: number; y: number }>, speedPxPerSec: number = WALK_SPEED_PX_PER_SEC): Promise<void> {
    if (this.isDestroyed) return
    // Anticipation pause
    this.setState('standing')
    await new Promise(r => setTimeout(r, 120))

    for (const pt of waypoints) {
      if (this.isDestroyed) return
      await this.walkTo(pt.x, pt.y, speedPxPerSec)
      // Small pause between turns
      await new Promise(r => setTimeout(r, 80))
    }

    // Arrival pause
    if (this.isDestroyed) return
    await new Promise(r => setTimeout(r, 150))
  }

  public walkTo(targetX: number, targetY: number, speedPxPerSec: number = WALK_SPEED_PX_PER_SEC): Promise<void> {
    return new Promise(resolve => {
      if (this.isDestroyed) {
        resolve()
        return
      }

      let startX = this.homeX
      let startY = this.homeY
      try {
        startX = this.container.x
        startY = this.container.y
      } catch {
        resolve()
        return
      }

      const dist = Math.hypot(targetX - startX, targetY - startY)

      // Calculate natural duration from distance (min 380ms)
      const durationMs = Math.max(380, Math.round((dist / speedPxPerSec) * 1000))
      const startTime = performance.now()
      this.setState('walking')

      if (this.sprite) {
        this.sprite.scale.x = targetX < startX ? -1.8 : 1.8
      }

      const tick = () => {
        if (this.isDestroyed) {
          resolve()
          return
        }

        const elapsed = performance.now() - startTime
        const t = Math.min(elapsed / durationMs, 1)
        // Smooth easeInOutQuad
        const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t

        try {
          this.container.x = startX + (targetX - startX) * eased
          this.container.y = startY + (targetY - startY) * eased
        } catch {
          resolve()
          return
        }

        if (t < 1) {
          requestAnimationFrame(tick)
        } else {
          try {
            if (this.container && !this.container.destroyed) {
              this.container.x = targetX
              this.container.y = targetY
            }
          } catch {
            // Safe fallback
          }
          this.setState('idle')
          resolve()
        }
      }
      requestAnimationFrame(tick)
    })
  }

  public async returnHome(speedPxPerSec: number = WALK_SPEED_PX_PER_SEC): Promise<void> {
    this.setState('returning')
    await this.walkTo(this.homeX, this.homeY, speedPxPerSec)
    if (this.sprite && !this.isDestroyed) this.sprite.scale.x = 1.8
    this.setState('idle')
    this.hideBubble()
  }

  public getState(): CharacterState {
    return this.state
  }

  public destroy() {
    this._destroyed = true
    this.hideBubble()
    if (this.sprite) {
      this.sprite.stop()
      this.sprite.destroy()
      this.sprite = null
    }
    this.statusDot = null
    try {
      this.container.destroy({ children: true })
    } catch {
      // Safe cleanup
    }
  }
}
