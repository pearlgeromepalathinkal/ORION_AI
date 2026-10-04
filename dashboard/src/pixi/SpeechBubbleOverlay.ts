import * as PIXI from 'pixi.js'
import type { CharacterSprite } from './CharacterSprite'

export type BubbleType =
  | 'alert'
  | 'message'
  | 'assignment'
  | 'question'
  | 'status'
  | 'investigation'
  | 'approval'
  | 'success'
  | 'error'
  | 'handoff'

interface ActiveBubble {
  id: string
  target: CharacterSprite | { x: number; y: number }
  container: PIXI.Container
  createdAt: number
  durationMs: number
  isFadingOut: boolean
}

export class SpeechBubbleOverlay {
  private overlayContainer: PIXI.Container
  private activeBubbles: Map<string, ActiveBubble> = new Map()

  constructor(parentContainer: PIXI.Container) {
    this.overlayContainer = new PIXI.Container()
    this.overlayContainer.label = 'SpeechBubbleOverlay'
    parentContainer.addChild(this.overlayContainer)
  }

  public showBubble(
    targetId: string,
    target: CharacterSprite | { x: number; y: number },
    text: string,
    durationMs: number = 3800,
    type: BubbleType = 'message'
  ): void {
    // Hide existing bubble for this target if present
    this.hideBubble(targetId)

    const bubbleContainer = new PIXI.Container()
    const paddingX = 7
    const paddingY = 4

    // Palette per type
    let borderColor = 0x38bdf8
    let tagText = ''
    let tagColor = 0x38bdf8

    switch (type) {
      case 'alert':
        borderColor = 0xef4444
        tagText = 'ALERT'
        tagColor = 0xef4444
        break
      case 'assignment':
        borderColor = 0xf59e0b
        tagText = 'ASSIGNMENT'
        tagColor = 0xfbbf24
        break
      case 'investigation':
        borderColor = 0xa855f7
        tagText = 'INVESTIGATING'
        tagColor = 0xc084fc
        break
      case 'handoff':
        borderColor = 0x38bdf8
        tagText = 'HANDOFF'
        tagColor = 0x38bdf8
        break
      case 'approval':
        borderColor = 0x10b981
        tagText = 'APPROVAL'
        tagColor = 0x34d399
        break
      case 'success':
        borderColor = 0x22c55e
        tagText = 'VERIFIED'
        tagColor = 0x4ade80
        break
      case 'error':
        borderColor = 0xf43f5e
        tagText = 'ERROR'
        tagColor = 0xfb7185
        break
      case 'question':
        borderColor = 0x818cf8
        tagText = 'QUESTION'
        tagColor = 0xa5b4fc
        break
      case 'status':
      case 'message':
      default:
        borderColor = 0x0284c7
        tagText = ''
        tagColor = 0x38bdf8
        break
    }

    // Header tag if any
    let tagTxt: PIXI.Text | null = null
    let tagH = 0
    if (tagText) {
      tagTxt = new PIXI.Text({
        text: `◈ ${tagText}`,
        style: {
          fontFamily: 'Inter, monospace',
          fontSize: 4.6,
          fontWeight: '800',
          fill: tagColor,
          letterSpacing: 0.6,
        },
      })
      tagH = tagTxt.height + 2
    }

    // Message text
    const msgTxt = new PIXI.Text({
      text,
      style: {
        fontFamily: 'Inter, sans-serif',
        fontSize: 5.6,
        fontWeight: '600',
        fill: 0xffffff,
        wordWrap: true,
        wordWrapWidth: 124,
        lineHeight: 8,
      },
    })

    const contentW = Math.max(msgTxt.width, tagTxt ? tagTxt.width : 0)
    const w = Math.min(140, Math.max(54, contentW + paddingX * 2))
    const h = (tagH ? tagH : 0) + msgTxt.height + paddingY * 2

    // Shadow backdrop
    const shadow = new PIXI.Graphics()
    shadow.roundRect(-w / 2 + 1, 2, w, h, 5)
    shadow.fill({ color: 0x000000, alpha: 0.45 })
    bubbleContainer.addChild(shadow)

    // Bubble background
    const bg = new PIXI.Graphics()
    bg.roundRect(-w / 2, 0, w, h, 4.5)
    bg.fill({ color: 0x030712, alpha: 0.96 })
    bg.stroke({ color: borderColor, width: 1.3 })

    // Little pointer triangle at bottom center
    bg.moveTo(-3.5, h)
    bg.lineTo(0, h + 4)
    bg.lineTo(3.5, h)
    bg.fill({ color: 0x030712, alpha: 0.96 })
    bubbleContainer.addChild(bg)

    let curY = paddingY
    if (tagTxt) {
      tagTxt.x = -w / 2 + paddingX
      tagTxt.y = curY
      bubbleContainer.addChild(tagTxt)
      curY += tagH
    }

    msgTxt.x = -w / 2 + paddingX
    msgTxt.y = curY
    bubbleContainer.addChild(msgTxt)

    // Initial position
    const pos = this.getTargetPosition(target)
    bubbleContainer.x = pos.x
    bubbleContainer.y = pos.y - h - 32
    bubbleContainer.alpha = 0
    bubbleContainer.scale.set(0.92)

    this.overlayContainer.addChild(bubbleContainer)

    const active: ActiveBubble = {
      id: targetId,
      target,
      container: bubbleContainer,
      createdAt: performance.now(),
      durationMs,
      isFadingOut: false,
    }
    this.activeBubbles.set(targetId, active)
  }

  public hideBubble(targetId: string): void {
    const active = this.activeBubbles.get(targetId)
    if (!active) return
    active.isFadingOut = true
  }

  public update(): void {
    const now = performance.now()
    const toRemove: string[] = []

    this.activeBubbles.forEach((b, id) => {
      const elapsed = now - b.createdAt

      // Animate position to track target character
      const targetPos = this.getTargetPosition(b.target)
      const targetY = targetPos.y - (b.container.height - 4) - 30
      b.container.x += (targetPos.x - b.container.x) * 0.35
      b.container.y += (targetY - b.container.y) * 0.35

      if (b.isFadingOut) {
        b.container.alpha -= 0.08
        b.container.scale.x = Math.max(0.85, b.container.scale.x - 0.01)
        b.container.scale.y = Math.max(0.85, b.container.scale.y - 0.01)
        if (b.container.alpha <= 0) {
          toRemove.push(id)
        }
      } else {
        // Entrance animation
        if (b.container.alpha < 1) {
          b.container.alpha = Math.min(1, b.container.alpha + 0.12)
          b.container.scale.x = Math.min(1, b.container.scale.x + 0.03)
          b.container.scale.y = Math.min(1, b.container.scale.y + 0.03)
        }
        // Check timeout
        if (b.durationMs > 0 && elapsed >= b.durationMs) {
          b.isFadingOut = true
        }
      }
    })

    toRemove.forEach(id => {
      const b = this.activeBubbles.get(id)
      if (b) {
        try {
          this.overlayContainer.removeChild(b.container)
          b.container.destroy({ children: true })
        } catch {
          // Safe destruction
        }
        this.activeBubbles.delete(id)
      }
    })
  }

  private getTargetPosition(target: CharacterSprite | { x: number; y: number }): { x: number; y: number } {
    if ('x' in target && 'y' in target) {
      try {
        return { x: target.x ?? 0, y: target.y ?? 0 }
      } catch {
        return { x: 0, y: 0 }
      }
    }
    return { x: 0, y: 0 }
  }

  public clearAll(): void {
    this.activeBubbles.forEach(b => {
      try {
        this.overlayContainer.removeChild(b.container)
        b.container.destroy({ children: true })
      } catch {
        // Safe cleanup
      }
    })
    this.activeBubbles.clear()
  }

  public destroy(): void {
    this.clearAll()
    try {
      this.overlayContainer.destroy({ children: true })
    } catch {
      // Safe cleanup
    }
  }
}
