"use client"

import { useRef, useEffect, useCallback } from "react"

// ============================================================
// ESCRIBE TU POEMA AQUI (cada linea es un verso)
// ============================================================
const POEMA: string[] = [
  "Nieves, amor mío,",
  "eres mi lugar seguro",
  "y el sueño al que siempre quiero volver.",
  "",
  "En ti encuentro calma,",
  "sonrisa, hogar,",
  "y un amor que no duda.",
  "",
  "Hoy y todos los días,",
  "mi corazón te elige.",
  "Feliz San Valentín."
]
// ============================================================

type Phase =
  | "heart"
  | "falling"
  | "impact"
  | "growing"
  | "leaves"
  | "sliding"
  | "poem"

interface LeafHeart {
  bx: number
  by: number
  color: string
  size: number
  angle: number
  layer: number
}

interface BranchTip {
  x: number
  y: number
  angle: number
  depth: number
}

// Seeded random for deterministic tree
function seededRandom(seed: number) {
  let s = seed
  return (min: number, max: number) => {
    s = (s * 16807 + 0) % 2147483647
    return min + (s / 2147483647) * (max - min)
  }
}

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phaseRef = useRef<Phase>("heart")
  const frameRef = useRef(0)
  const timeRef = useRef(0)

  const ballY = useRef(0)
  const ballVel = useRef(0)

  const treeProgress = useRef(0)
  const leavesProgress = useRef(0)

  const slideOffset = useRef(0)
  const poemChars = useRef(0)
  const poemDone = useRef(false)

  const leafHearts = useRef<LeafHeart[]>([])
  const branchTips = useRef<BranchTip[]>([])
  const treeSeed = useRef(42)

  // ── REALISTIC HEART ──
  const drawHeart = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      size: number,
      color: string,
      rotation = 0,
      withShadow = false,
    ) => {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(rotation)

      if (withShadow) {
        ctx.shadowColor = "rgba(0,0,0,0.15)"
        ctx.shadowBlur = size * 0.4
        ctx.shadowOffsetY = size * 0.1
      }

      // Better heart curve
      const s = size
      ctx.beginPath()
      ctx.moveTo(0, s * 0.35)
      // Left lobe
      ctx.bezierCurveTo(-s * 0.05, s * 0.1, -s * 0.7, -s * 0.2, -s * 0.5, -s * 0.5)
      ctx.bezierCurveTo(-s * 0.35, -s * 0.75, -s * 0.05, -s * 0.85, 0, -s * 0.5)
      // Right lobe
      ctx.bezierCurveTo(s * 0.05, -s * 0.85, s * 0.35, -s * 0.75, s * 0.5, -s * 0.5)
      ctx.bezierCurveTo(s * 0.7, -s * 0.2, s * 0.05, s * 0.1, 0, s * 0.35)
      ctx.closePath()

      // Gradient fill for realism
      const grad = ctx.createRadialGradient(
        -s * 0.15, -s * 0.3, s * 0.05,
        0, -s * 0.1, s * 0.8,
      )
      grad.addColorStop(0, lightenColor(color, 40))
      grad.addColorStop(0.5, color)
      grad.addColorStop(1, darkenColor(color, 30))
      ctx.fillStyle = grad
      ctx.fill()

      // Specular highlight
      ctx.beginPath()
      ctx.ellipse(-s * 0.2, -s * 0.45, s * 0.12, s * 0.18, -0.3, 0, Math.PI * 2)
      ctx.fillStyle = "rgba(255,255,255,0.35)"
      ctx.fill()

      ctx.restore()
    },
    [],
  )

  // ── REALISTIC RECURSIVE TREE ──
  const drawTreeBranch = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x1: number,
      y1: number,
      angle: number,
      length: number,
      width: number,
      depth: number,
      progress: number,
      rand: (min: number, max: number) => number,
      tips: BranchTip[],
    ) => {
      if (depth <= 0 || length < 2 || progress <= 0) return

      const actualLength = length * Math.min(progress, 1)
      const segments = Math.max(4, Math.floor(length / 8))
      let cx = x1
      let cy = y1
      let curAngle = angle
      const wobble = rand(-0.02, 0.02)

      // Build path points
      const points: { x: number; y: number }[] = [{ x: cx, y: cy }]
      for (let i = 1; i <= segments; i++) {
        const t = i / segments
        curAngle += wobble + rand(-0.04, 0.04) * (1 + depth * 0.1)
        const step = actualLength / segments
        cx += Math.cos(curAngle) * step
        cy += Math.sin(curAngle) * step
        points.push({ x: cx, y: cy })
      }

      // Draw thick organic branch shape
      for (let i = 0; i < points.length - 1; i++) {
        const t = i / (points.length - 1)
        const w = width * (1 - t * 0.7) * 0.5
        const p1 = points[i]
        const p2 = points[i + 1]
        const a = Math.atan2(p2.y - p1.y, p2.x - p1.x)
        const perpA = a + Math.PI / 2

        ctx.beginPath()
        ctx.moveTo(p1.x + Math.cos(perpA) * w, p1.y + Math.sin(perpA) * w)
        ctx.lineTo(p2.x + Math.cos(perpA) * w * 0.85, p2.y + Math.sin(perpA) * w * 0.85)
        ctx.lineTo(p2.x - Math.cos(perpA) * w * 0.85, p2.y - Math.sin(perpA) * w * 0.85)
        ctx.lineTo(p1.x - Math.cos(perpA) * w, p1.y - Math.sin(perpA) * w)
        ctx.closePath()

        // Bark gradient
        const barkGrad = ctx.createLinearGradient(
          p1.x + Math.cos(perpA) * w, p1.y + Math.sin(perpA) * w,
          p1.x - Math.cos(perpA) * w, p1.y - Math.sin(perpA) * w,
        )
        const barkBase = depth > 3 ? "#4a3728" : depth > 2 ? "#5a4332" : "#6b5040"
        barkGrad.addColorStop(0, lightenColor(barkBase, 15))
        barkGrad.addColorStop(0.3, barkBase)
        barkGrad.addColorStop(0.7, darkenColor(barkBase, 10))
        barkGrad.addColorStop(1, lightenColor(barkBase, 5))
        ctx.fillStyle = barkGrad
        ctx.fill()
      }

      // Bark texture lines
      if (width > 4) {
        ctx.strokeStyle = "rgba(0,0,0,0.08)"
        ctx.lineWidth = 0.5
        for (let k = 0; k < 3; k++) {
          const offset = rand(-width * 0.2, width * 0.2)
          ctx.beginPath()
          for (let i = 0; i < points.length; i++) {
            const p = points[i]
            const a2 = i < points.length - 1
              ? Math.atan2(points[i + 1].y - p.y, points[i + 1].x - p.x) + Math.PI / 2
              : Math.atan2(p.y - points[i - 1].y, p.x - points[i - 1].x) + Math.PI / 2
            const px = p.x + Math.cos(a2) * offset
            const py = p.y + Math.sin(a2) * offset
            if (i === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          }
          ctx.stroke()
        }
      }

      if (progress < 0.3) return

      const childProgress = (progress - 0.3) / 0.7
      const endP = points[points.length - 1]

      // Store tips for leaf placement
      if (depth <= 2) {
        tips.push({ x: endP.x, y: endP.y, angle: curAngle, depth })
      }

      // Branching
      if (depth > 1) {
        const numBranches = depth > 3 ? Math.floor(rand(2, 4)) : Math.floor(rand(2, 3))
        for (let b = 0; b < numBranches; b++) {
          const spreadAngle = rand(0.3, 0.8) * (b % 2 === 0 ? 1 : -1)
          const branchAngle = curAngle + spreadAngle + rand(-0.15, 0.15)
          const branchLen = length * rand(0.55, 0.75)
          const branchWidth = width * rand(0.5, 0.7)

          // Stagger branch growth
          const branchDelay = b * 0.15
          const branchProg = Math.max(0, childProgress - branchDelay) / (1 - branchDelay)

          drawTreeBranch(
            ctx, endP.x, endP.y,
            branchAngle, branchLen, branchWidth,
            depth - 1, branchProg, rand, tips,
          )
        }

        // Extra small side branches on thick branches
        if (depth > 2 && childProgress > 0.5) {
          const midIdx = Math.floor(points.length * 0.5)
          const midP = points[midIdx]
          const sideAngle = curAngle + rand(0.5, 1.2) * (rand(0, 1) > 0.5 ? 1 : -1)
          drawTreeBranch(
            ctx, midP.x, midP.y,
            sideAngle, length * rand(0.3, 0.45), width * 0.4,
            depth - 2, (childProgress - 0.5) * 2, rand, tips,
          )
        }
      }
    },
    [],
  )

  const drawFullTree = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      baseX: number,
      baseY: number,
      progress: number,
      maxH: number,
    ) => {
      const rand = seededRandom(treeSeed.current)
      const tips: BranchTip[] = []

      // Small roots at base
      const rootProg = Math.min(progress / 0.1, 1)
      if (rootProg > 0) {
        ctx.strokeStyle = "#4a3728"
        ctx.lineCap = "round"
        for (let i = 0; i < 5; i++) {
          const ra = rand(-0.8, 0.8)
          const rl = rand(15, 40) * rootProg * (maxH / 400)
          ctx.lineWidth = rand(2, 5) * (maxH / 400)
          ctx.beginPath()
          ctx.moveTo(baseX, baseY)
          ctx.quadraticCurveTo(
            baseX + Math.cos(Math.PI / 2 + ra) * rl * 0.5,
            baseY + Math.abs(Math.sin(ra)) * rl * 0.3,
            baseX + Math.cos(ra) * rl,
            baseY + Math.abs(Math.sin(ra + 0.3)) * rl * 0.4 + 3,
          )
          ctx.stroke()
        }
      }

      // Main trunk + recursive branches
      const trunkLen = maxH * 0.42
      const trunkW = maxH * 0.04
      drawTreeBranch(
        ctx, baseX, baseY,
        -Math.PI / 2 + rand(-0.03, 0.03),
        trunkLen, trunkW,
        6, progress,
        rand, tips,
      )

      branchTips.current = tips
    },
    [drawTreeBranch],
  )

  // ── GENERATE LEAVES ──
  const generateLeafHearts = useCallback(() => {
    const colors = [
      "#e74c3c", "#c0392b", "#e91e63", "#d81b60", "#f44336",
      "#ff5722", "#ff7043", "#ff8a65", "#ef5350", "#ec407a",
      "#f06292", "#ff80ab", "#ff5252", "#ff1744", "#d50000",
      "#ad1457", "#880e4f", "#ff6f00", "#ff9800", "#ffab40",
      "#ce93d8", "#ba68c8", "#ab47bc",
    ]
    const hearts: LeafHeart[] = []
    for (let i = 0; i < 160; i++) {
      hearts.push({
        bx: (Math.random() - 0.5) * 2.2,
        by: Math.random(),
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 7 + 6,
        angle: (Math.random() - 0.5) * 0.6,
        layer: Math.random(),
      })
    }
    // Sort by layer for depth
    hearts.sort((a, b) => a.layer - b.layer)
    leafHearts.current = hearts
  }, [])

  // Position leaves around branch tips and crown area
  const getLeafWorldPos = useCallback(
    (
      baseX: number,
      baseY: number,
      maxH: number,
      leaf: LeafHeart,
    ) => {
      const tips = branchTips.current
      if (tips.length === 0) {
        // Fallback: crown area
        const crownCenterY = baseY - maxH * 0.55
        const crownW = maxH * 0.6
        const crownH = maxH * 0.5
        return {
          x: baseX + leaf.bx * crownW * 0.5,
          y: crownCenterY + (leaf.by - 0.5) * crownH * 0.5,
        }
      }

      // Pick a tip based on leaf index
      const tipIdx = Math.floor(leaf.layer * tips.length) % tips.length
      const tip = tips[tipIdx]
      const spread = maxH * 0.12
      return {
        x: tip.x + leaf.bx * spread,
        y: tip.y + (leaf.by - 0.5) * spread * 0.8,
      }
    },
    [],
  )

  const handleClick = useCallback(() => {
    if (phaseRef.current === "heart") {
      phaseRef.current = "falling"
      const canvas = canvasRef.current
      if (canvas) {
        ballY.current = canvas.height / 2
      }
      ballVel.current = 0
    }
  }, [])

  useEffect(() => {
    generateLeafHearts()
    treeSeed.current = 42 + Math.floor(Math.random() * 1000)

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)

    let animId: number

    const loop = () => {
      const W = window.innerWidth
      const H = window.innerHeight
      timeRef.current += 1 / 60

      ctx.fillStyle = "#f5f0e8"
      ctx.fillRect(0, 0, W, H)

      const phase = phaseRef.current

      // ── HEART ──
      if (phase === "heart") {
        const t = timeRef.current
        // Realistic heartbeat: double-pulse
        const beat1 = Math.max(0, Math.sin(t * 4)) ** 3
        const beat2 = Math.max(0, Math.sin(t * 4 + 0.8)) ** 5
        const beatScale = 1 + (beat1 * 0.08 + beat2 * 0.04)
        const s = 70 * beatScale

        // Soft shadow
        ctx.save()
        ctx.globalAlpha = 0.12
        drawHeart(ctx, W / 2 + 2, H / 2 + 4, s * 1.05, "#8B0000", 0, false)
        ctx.restore()

        drawHeart(ctx, W / 2, H / 2, s, "#dc143c", 0, true)

        // Subtle pulse ring
        ctx.save()
        const ringAlpha = beat1 * 0.08
        ctx.globalAlpha = ringAlpha
        drawHeart(ctx, W / 2, H / 2, s * 1.3, "#ff6b6b", 0, false)
        ctx.restore()

        // "Click me" hint
        const hintAlpha = 0.3 + Math.sin(t * 2) * 0.15
        ctx.save()
        ctx.globalAlpha = hintAlpha
        ctx.font = "14px Georgia, serif"
        ctx.fillStyle = "#8B7355"
        ctx.textAlign = "center"
        ctx.fillText("haz click", W / 2, H / 2 + 90)
        ctx.restore()
      }

      // ── FALLING ──
      if (phase === "falling") {
        ballVel.current += 0.7
        ballY.current += ballVel.current
        const groundY = H - 50

        if (ballY.current >= groundY) {
          ballY.current = groundY
          phaseRef.current = "impact"
          frameRef.current = 0
        }

        // Morphing heart to circle
        const fallProg = Math.min(ballVel.current / 15, 1)
        const r = 18 + fallProg * 4
        ctx.beginPath()
        ctx.arc(W / 2, ballY.current, r, 0, Math.PI * 2)
        const ballGrad = ctx.createRadialGradient(
          W / 2 - r * 0.3, ballY.current - r * 0.3, r * 0.1,
          W / 2, ballY.current, r,
        )
        ballGrad.addColorStop(0, "#e74c3c")
        ballGrad.addColorStop(1, "#8B2500")
        ctx.fillStyle = ballGrad
        ctx.fill()

        // Motion blur
        ctx.save()
        ctx.globalAlpha = 0.15
        ctx.beginPath()
        ctx.arc(W / 2, ballY.current - ballVel.current * 1.5, r * 0.8, 0, Math.PI * 2)
        ctx.fillStyle = "#e74c3c"
        ctx.fill()
        ctx.restore()
      }

      // ── IMPACT ──
      if (phase === "impact") {
        frameRef.current++
        const groundY = H - 50
        const f = frameRef.current

        // Earth particles
        if (f < 40) {
          const alpha = 1 - f / 40
          for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI + Math.sin(i * 2.3) * 0.3
            const dist = f * 2.5 * (0.5 + Math.sin(i * 1.7) * 0.5)
            const px = W / 2 + Math.cos(angle) * dist
            const py = groundY - Math.sin(angle) * dist * 0.6
            const pSize = (3 + Math.sin(i) * 2) * (1 - f / 40)
            ctx.beginPath()
            ctx.arc(px, py, pSize, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(101, 67, 33, ${alpha})`
            ctx.fill()
          }
        }

        // Ball sinks
        const shrink = Math.min(f / 45, 1)
        const r = 20 * (1 - shrink)
        if (r > 0.5) {
          ctx.beginPath()
          ctx.arc(W / 2, groundY, r, 0, Math.PI * 2)
          ctx.fillStyle = "#654321"
          ctx.fill()
        }

        // Crack / earth mark
        ctx.save()
        ctx.globalAlpha = Math.min(f / 20, 0.4)
        ctx.strokeStyle = "#5a3d1a"
        ctx.lineWidth = 1.5
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI - Math.PI * 0.1
          const len = 15 + i * 8
          ctx.beginPath()
          ctx.moveTo(W / 2, groundY)
          ctx.lineTo(W / 2 + Math.cos(a) * len, groundY + Math.sin(a) * len * 0.3 + 2)
          ctx.stroke()
        }
        ctx.restore()

        if (f > 55) {
          phaseRef.current = "growing"
          treeProgress.current = 0
        }
      }

      // ── GROWING ──
      if (phase === "growing") {
        treeProgress.current += 0.003
        const groundY = H - 50
        const maxH = H * 0.75

        drawFullTree(ctx, W / 2, groundY, treeProgress.current, maxH)

        if (treeProgress.current >= 1) {
          phaseRef.current = "leaves"
          leavesProgress.current = 0
        }
      }

      // ── LEAVES ──
      if (phase === "leaves") {
        leavesProgress.current += 0.006
        const groundY = H - 50
        const maxH = H * 0.75

        drawFullTree(ctx, W / 2, groundY, 1, maxH)

        const total = leafHearts.current.length
        const visibleCount = Math.floor(leavesProgress.current * total)

        for (let i = 0; i < Math.min(visibleCount, total); i++) {
          const leaf = leafHearts.current[i]
          const pos = getLeafWorldPos(W / 2, groundY, maxH, leaf)
          const appearT = Math.min((leavesProgress.current - i / total) * 4, 1)
          if (appearT > 0) {
            const s = leaf.size * appearT
            // Slight bounce
            const bounce = appearT < 1 ? Math.sin(appearT * Math.PI) * 0.3 : 0
            drawHeart(ctx, pos.x, pos.y - bounce * 10, s, leaf.color, leaf.angle)
          }
        }

        if (leavesProgress.current >= 1.4) {
          phaseRef.current = "sliding"
          slideOffset.current = 0
        }
      }

      // ── SLIDING ──
      if (phase === "sliding") {
        slideOffset.current += 2.5
        const targetX = W * 0.7
        const currentTreeX = W / 2 + slideOffset.current
        const groundY = H - 50
        const maxH = H * 0.75

        if (currentTreeX >= targetX) {
          slideOffset.current = targetX - W / 2
          phaseRef.current = "poem"
          poemChars.current = 0
          poemDone.current = false
        }

        const tx = W / 2 + slideOffset.current
        drawFullTree(ctx, tx, groundY, 1, maxH)

        for (const leaf of leafHearts.current) {
          const pos = getLeafWorldPos(tx, groundY, maxH, leaf)
          drawHeart(ctx, pos.x, pos.y, leaf.size, leaf.color, leaf.angle)
        }
      }

      // ── POEM ──
      if (phase === "poem") {
        const groundY = H - 50
        const maxH = H * 0.75
        const tx = W / 2 + slideOffset.current
        const t = timeRef.current

        drawFullTree(ctx, tx, groundY, 1, maxH)

        // Leaves with gentle sway
        for (let i = 0; i < leafHearts.current.length; i++) {
          const leaf = leafHearts.current[i]
          const pos = getLeafWorldPos(tx, groundY, maxH, leaf)
          const sway = Math.sin(t * 1.5 + i * 0.4) * 2.5
          const swayY = Math.sin(t * 1.2 + i * 0.7) * 1
          drawHeart(
            ctx,
            pos.x + sway,
            pos.y + swayY,
            leaf.size,
            leaf.color,
            leaf.angle + Math.sin(t + i * 0.5) * 0.08,
          )
        }

        // Occasional falling heart petal
        const fallingCount = 3
        for (let i = 0; i < fallingCount; i++) {
          const ft = (t * 0.3 + i * 3.7) % 8
          if (ft < 6) {
            const fx = tx + Math.sin(ft * 2 + i * 5) * maxH * 0.3
            const fy = groundY - maxH * 0.7 + ft * maxH * 0.13
            const fa = Math.sin(ft * 3 + i) * 0.5
            const fAlpha = ft < 5 ? 0.5 : 0.5 * (6 - ft)
            ctx.save()
            ctx.globalAlpha = fAlpha
            drawHeart(ctx, fx, fy, 5, "#e74c3c", fa)
            ctx.restore()
          }
        }

        // Typewriter
        if (!poemDone.current) {
          poemChars.current += 0.7
        }

        const fullText = POEMA.join("\n")
        const charsToShow = Math.min(Math.floor(poemChars.current), fullText.length)
        if (charsToShow >= fullText.length) {
          poemDone.current = true
        }

        const visibleText = fullText.substring(0, charsToShow)
        const lines = visibleText.split("\n")

        const poemX = W * 0.05
        const poemStartY = H * 0.15
        const fontSize = Math.min(20, Math.max(14, W * 0.018))
        const lineH = fontSize * 1.8

        ctx.font = `italic ${fontSize}px Georgia, "Times New Roman", serif`
        ctx.textAlign = "left"
        ctx.textBaseline = "top"

        // Text shadow
        for (let i = 0; i < lines.length; i++) {
          ctx.fillStyle = "rgba(93, 64, 55, 0.08)"
          ctx.fillText(lines[i], poemX + 1, poemStartY + i * lineH + 1)
          ctx.fillStyle = "#5D4037"
          ctx.fillText(lines[i], poemX, poemStartY + i * lineH)
        }

        // Cursor
        if (!poemDone.current) {
          const lastIdx = lines.length - 1
          const lastLine = lines[lastIdx] || ""
          const lw = ctx.measureText(lastLine).width
          const cy2 = poemStartY + lastIdx * lineH
          if (Math.floor(t * 3) % 2 === 0) {
            ctx.fillStyle = "#5D4037"
            ctx.fillRect(poemX + lw + 3, cy2 + 2, 2, fontSize * 1.1)
          }
        }

        // End heart
        if (poemDone.current) {
          const endY = poemStartY + lines.length * lineH + 20
          const pulse = 1 + Math.sin(t * 2.5) * 0.1
          drawHeart(ctx, poemX + 12, endY + 5, 12 * pulse, "#dc143c", 0, true)
        }
      }

      animId = requestAnimationFrame(loop)
    }

    animId = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener("resize", resize)
    }
  }, [drawHeart, drawFullTree, getLeafWorldPos, generateLeafHearts])

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{
        display: "block",
        width: "100vw",
        height: "100vh",
        cursor: "pointer",
        background: "#f5f0e8",
      }}
    />
  )
}

// ── Color utilities ──
function lightenColor(hex: string, amount: number): string {
  const num = Number.parseInt(hex.replace("#", ""), 16)
  const r = Math.min(255, ((num >> 16) & 0xff) + amount)
  const g = Math.min(255, ((num >> 8) & 0xff) + amount)
  const b = Math.min(255, (num & 0xff) + amount)
  return `rgb(${r},${g},${b})`
}

function darkenColor(hex: string, amount: number): string {
  const num = Number.parseInt(hex.replace("#", ""), 16)
  const r = Math.max(0, ((num >> 16) & 0xff) - amount)
  const g = Math.max(0, ((num >> 8) & 0xff) - amount)
  const b = Math.max(0, (num & 0xff) - amount)
  return `rgb(${r},${g},${b})`
}
