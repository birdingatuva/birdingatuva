"use client"

import { useEffect, useRef, useState, type PointerEvent } from 'react'

type Drag = {
  id: string
  pointerId: number
  startY: number
  pointerY: number
  scrollY: number
  ids: string[]
  order: string[]
  tops: number[]
  heights: number[]
  gap: number
  lastDelta?: number
  offsets: Record<string, number>
}

// Keep the actual rows mounted in place while transforms preview the new order.
export function useLinkSort(onDrop: (ids: string[]) => void) {
  const nodes = useRef(new Map<string, HTMLDivElement>())
  const frame = useRef<number | null>(null)
  const current = useRef<Drag | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const drop = useRef(onDrop)
  drop.current = onDrop

  function update() {
    const state = current.current
    if (!state) return
    const from = state.ids.indexOf(state.id)
    const delta = state.pointerY - state.startY + window.scrollY - state.scrollY
    if (state.lastDelta === delta) return
    state.lastDelta = delta
    const center = state.tops[from] + state.heights[from] / 2 + delta
    let to = from
    while (to < state.ids.length - 1 && center > state.tops[to + 1] + state.heights[to + 1] / 2) to++
    while (to > 0 && center < state.tops[to - 1] + state.heights[to - 1] / 2) to--
    const order = [...state.ids]
    order.splice(from, 1)
    order.splice(to, 0, state.id)
    const offsets: Record<string, number> = {}
    let top = state.tops[0]
    for (const id of order) {
      const index = state.ids.indexOf(id)
      offsets[id] = top - state.tops[index]
      top += state.heights[index] + state.gap
    }
    offsets[state.id] = Math.max(state.tops[0] - state.tops[from], Math.min(delta,
      state.tops.at(-1)! + state.heights.at(-1)! - state.heights[from] - state.tops[from]))
    state.order = order
    for (const id of state.ids) {
      if (state.offsets[id] !== offsets[id]) {
        const node = nodes.current.get(id)
        if (node) node.style.transform = `translateY(${offsets[id]}px)`
      }
    }
    state.offsets = offsets
  }

  function reset() {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    nodes.current.forEach(node => { node.style.transform = ''; node.style.willChange = '' })
    current.current = null
    setDrag(null)
  }

  function tick() {
    const state = current.current
    if (!state) return
    const edge = 72
    const speed = state.pointerY < edge ? -12 * (1 - Math.max(0, state.pointerY) / edge)
      : state.pointerY > window.innerHeight - edge ? 12 * (1 - Math.max(0, window.innerHeight - state.pointerY) / edge) : 0
    if (speed) window.scrollBy(0, speed)
    update()
    frame.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    const cancel = reset
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') cancel() }
    window.addEventListener('keydown', keydown)
    window.addEventListener('blur', cancel)
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      window.removeEventListener('keydown', keydown)
      window.removeEventListener('blur', cancel)
    }
  }, [])

  function start(event: PointerEvent<HTMLElement>, id: string, ids: string[]) {
    if (event.button !== 0 || !event.isPrimary || current.current) return
    event.preventDefault()
    nodes.current.forEach(node => {
      node.getAnimations().forEach(animation => animation.cancel())
      node.style.willChange = 'transform'
    })
    const rects = ids.map(key => nodes.current.get(key)!.getBoundingClientRect())
    event.currentTarget.setPointerCapture(event.pointerId)
    current.current = {
      id, pointerId: event.pointerId, startY: event.clientY, pointerY: event.clientY,
      scrollY: window.scrollY, ids, order: ids, tops: rects.map(rect => rect.top),
      heights: rects.map(rect => rect.height), gap: rects.length > 1 ? rects[1].top - rects[0].bottom : 0,
      offsets: {},
    }
    setDrag(current.current)
    frame.current = requestAnimationFrame(tick)
  }

  function finish(event: PointerEvent<HTMLElement>, cancelled = false) {
    if (current.current?.pointerId !== event.pointerId) return
    if (!cancelled) { current.current.pointerY = event.clientY; update() }
    const state = current.current!
    const changed = state.order.some((id, index) => id !== state.ids[index])
    // Animate the final few pixels into the slot before React commits the order.
    const rects = new Map([...nodes.current].map(([id, node]) => [id, node.getBoundingClientRect().top]))
    reset()
    if (!cancelled && changed) drop.current(state.order)
    requestAnimationFrame(() => {
      if (current.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      nodes.current.forEach((node, id) => {
        const previous = rects.get(id)
        if (previous === undefined) return
        const delta = previous - node.getBoundingClientRect().top
        if (delta) node.animate([{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }], { duration: 160, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' })
      })
    })
  }

  return {
    nodes, drag, start, finish,
    move(event: PointerEvent<HTMLElement>) {
      if (current.current?.pointerId !== event.pointerId) return
      current.current.pointerY = event.clientY
    },
  }
}
