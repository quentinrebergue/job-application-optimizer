'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** What a demo script can do: wait, move the cursor onto a drawn piece (data-target), press it, type. */
export interface DemoTools {
  wait(ms: number): Promise<void>
  moveTo(target: string): Promise<void>
  press(target: string): Promise<void>
  type(text: string, set: (value: string) => void, perTick?: number): Promise<void>
  hideCursor(): void
}

interface DemoOptions {
  /** Play again and again (the hero) or once (the sections) */
  loop: boolean
  /** Start only when the stage is half on screen */
  whenVisible: boolean
  /** Pause between two loops */
  holdMs?: number
}

const CURSOR_START = { x: 280, y: 300, visible: false }

/**
 * Plays a script of cursor moves on a drawn stage. The script sets the state
 * of the drawing itself and starts by resetting it. With prefers-reduced-motion
 * nothing plays: the component shows its finished picture (`reduced`).
 */
export function useDemo(script: (tools: DemoTools) => Promise<void>, { loop, whenVisible, holdMs = 0 }: DemoOptions) {
  const stage = useRef<HTMLDivElement>(null)
  const latestScript = useRef(script)
  useEffect(() => { latestScript.current = script })

  const [cursor, setCursor] = useState(CURSOR_START)
  const [pressed, setPressed] = useState<string | null>(null)
  const [playing, setPlaying] = useState(true)
  const [reduced, setReduced] = useState(false)
  const [visible, setVisible] = useState(!whenVisible)
  const [done, setDone] = useState(false)
  const [run, setRun] = useState(0)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const box = stage.current
    if (!whenVisible || !box) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.5 },
    )
    observer.observe(box)
    return () => observer.disconnect()
  }, [whenVisible])

  useEffect(() => {
    if (!playing || reduced || !visible) return
    let alive = true
    const wait = async (ms: number) => {
      await new Promise((resolve) => setTimeout(resolve, ms))
      if (!alive) throw new Error('stopped')
    }
    const tools: DemoTools = {
      wait,
      async moveTo(target) {
        const box = stage.current
        const element = box?.querySelector<HTMLElement>(`[data-target="${target}"]`)
        if (!box || !element) return
        const from = box.getBoundingClientRect()
        const to = element.getBoundingClientRect()
        setCursor({ x: to.left - from.left + to.width * 0.55, y: to.top - from.top + to.height * 0.55, visible: true })
        await wait(700)
      },
      async press(target) {
        setPressed(target)
        await wait(170)
        setPressed(null)
      },
      async type(text, set, perTick = 1) {
        for (let i = perTick; i < text.length + perTick; i += perTick) {
          set(text.slice(0, i))
          await wait(26)
        }
      },
      hideCursor: () => setCursor((c) => ({ ...c, visible: false })),
    }
    const play = async () => {
      do {
        await latestScript.current(tools)
        if (loop) await wait(holdMs)
      } while (loop)
      setDone(true)
    }
    play().catch(() => {})
    return () => { alive = false }
  }, [playing, reduced, visible, run, loop, holdMs])

  const replay = useCallback(() => {
    setDone(false)
    setPlaying(true)
    setRun((n) => n + 1)
  }, [])

  // The ref comes apart from the state: React's lint forbids reading an object that holds a ref while rendering.
  const demo = {
    cursor, playing, reduced, done,
    toggle: () => setPlaying((on) => !on),
    replay,
    /**
     * Class of a drawn button while the cursor presses it: it moves onto its
     * shadow by a plain offset. No transform and no transition on purpose: Safari
     * on iPhone leaves a 4 px ghost of a button that moves this way and is
     * removed right after (the demo changes screen).
     */
    lift: (target: string) => (pressed === target ? 'relative left-1 top-1 shadow-none' : 'relative shadow-hard'),
  }
  return [stage, demo] as const
}

export type Demo = ReturnType<typeof useDemo>[1]
