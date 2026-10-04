/**
 * Prompt 6: Knowledge Learning Loop UI
 *
 * Renders a live "KB Entries" counter on the floor near the Knowledge Lab.
 * Each time an incident resolves and knowledge is captured, animates a
 * "+1 KB" bubble floating up from the lab and increments the counter.
 */
import * as PIXI from 'pixi.js'

export class KnowledgeCounter {
  private container: PIXI.Container
  private countText: PIXI.Text
  private bgGraphic: PIXI.Graphics
  private count: number = 0
  private x: number
  private y: number
  private _destroyed: boolean = false

  constructor(parent: PIXI.Container, x: number = 540, y: number = 300) {
    this.x = x
    this.y = y
    this.container = new PIXI.Container()
    this.container.x = x
    this.container.y = y

    // Background pill
    this.bgGraphic = new PIXI.Graphics()
    this.container.addChild(this.bgGraphic)

    // Counter text
    this.countText = new PIXI.Text({
      text: 'KB: 0 entries',
      style: {
        fontFamily: 'Inter, monospace',
        fontSize: 7,
        fontWeight: '700',
        fill: 0xa7f3d0,
      },
    })
    this.countText.anchor.set(0.5, 0.5)
    this.container.addChild(this.countText)

    this.drawBg(1.0)
    parent.addChild(this.container)
  }

  private drawBg(pulse: number) {
    const w = 64, h = 14
    this.bgGraphic.clear()
    this.bgGraphic.roundRect(-w / 2, -h / 2, w, h, 4)
    this.bgGraphic.fill({ color: 0x022c22, alpha: 0.9 })
    this.bgGraphic.stroke({ color: 0x34d399, width: 1, alpha: pulse })
  }

  public increment(parent: PIXI.Container) {
    this.count++
    this.countText.text = `KB: ${this.count} ${this.count === 1 ? 'entry' : 'entries'}`

    // Pulse the counter
    let scale = 1.4
    const shrink = () => {
      if (this._destroyed) return
      scale = Math.max(1.0, scale - 0.05)
      this.container.scale.set(scale)
      this.drawBg(scale * 0.7)
      if (scale > 1.0) requestAnimationFrame(shrink)
    }
    this.container.scale.set(scale)
    requestAnimationFrame(shrink)

    // Float a "+1 KB" bubble upward
    this.spawnBubble(parent)
  }

  private spawnBubble(parent: PIXI.Container) {
    const bubble = new PIXI.Text({
      text: '+1 KB captured',
      style: {
        fontFamily: 'Inter, monospace',
        fontSize: 6,
        fontWeight: '700',
        fill: 0x4ade80,
      },
    })
    bubble.anchor.set(0.5, 0.5)
    bubble.x = this.x
    bubble.y = this.y - 10
    bubble.alpha = 1.0
    parent.addChild(bubble)

    let vy = -0.8, alpha = 1.0
    const float = () => {
      if (this._destroyed) { parent.removeChild(bubble); return }
      bubble.y += vy
      alpha -= 0.025
      bubble.alpha = Math.max(0, alpha)
      if (alpha > 0) requestAnimationFrame(float)
      else parent.removeChild(bubble)
    }
    requestAnimationFrame(float)
  }

  public getCount(): number {
    return this.count
  }

  public reset() {
    this.count = 0
    this.countText.text = 'KB: 0 entries'
    this.drawBg(1.0)
  }

  public destroy() {
    this._destroyed = true
    this.container.destroy({ children: true })
  }
}
