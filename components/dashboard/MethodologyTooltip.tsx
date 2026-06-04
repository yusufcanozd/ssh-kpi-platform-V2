'use client'

import type { ReactNode } from 'react'

type Align = 'left' | 'right'

type MethodologyProps = {
  title?: string
  children?: ReactNode
  align?: Align
}

export default function MethodologyTooltip(_props: MethodologyProps) {
  return null
}

export function GeneralScoreMethodology(_props: { align?: Align }) {
  return null
}

export function CategoryScoreMethodology(_props: { align?: Align }) {
  return null
}

export function KpiMethodologyTooltip(_props: {
  detail?: unknown
  kpiName: string
  align?: Align
}) {
  return null
}
