'use client'

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import Tree from 'react-d3-tree'
import type { CustomNodeElementProps, Point } from 'react-d3-tree'
import { Modal } from '@/components/ui/Modal'
import { buildFullDecisionTree } from '@/config'

interface Props {
  open: boolean
  onClose: () => void
  /** Node ids (real `DecisionNode.id`s, not viz question ids) on the current exercise's path. Omit for a blank, unhighlighted tree. */
  pathNodeIds?: Set<string>
  /** The leaf node id the current exercise's correct pattern resolves to. Omit for a blank, unhighlighted tree. */
  leafNodeId?: string
}

const NODE_SIZE = { x: 210, y: 150 }

function renderNode(
  { nodeDatum }: CustomNodeElementProps,
  pathNodeIds: Set<string> | undefined,
  leafNodeId: string | undefined
) {
  const kind = nodeDatum.attributes?.kind as string
  const nodeId = String(nodeDatum.attributes?.nodeId ?? '')
  const answerText = String(nodeDatum.attributes?.answer ?? '')
  const realId = kind === 'question' ? nodeId.replace(/__q$/, '') : nodeId
  const onPath = pathNodeIds
    ? kind === 'question'
      ? pathNodeIds.has(realId) && realId !== leafNodeId
      : pathNodeIds.has(realId)
    : false
  const isFinalLeaf = !!leafNodeId && kind === 'leaf' && realId === leafNodeId

  // No path given yet (blank tree, shown before an answer is picked): every
  // question is orange, every answer/leaf is a plain white/black square —
  // nothing has been ruled out or confirmed yet.
  const colorClasses = !pathNodeIds
    ? kind === 'question'
      ? 'border-orange-400 bg-orange-50 text-orange-800 font-semibold'
      : 'border-slate-300 bg-white text-slate-900'
    : isFinalLeaf
      ? 'border-green-600 bg-green-600 text-white font-bold'
      : kind === 'question'
        ? onPath
          ? 'border-orange-400 bg-orange-50 text-orange-800 font-semibold'
          : 'border-slate-200 bg-slate-50 text-slate-400'
        : onPath
          ? 'border-green-400 bg-green-100 text-green-800 font-semibold'
          : 'border-slate-200 bg-white text-slate-400'

  return (
    <g>
      <foreignObject width={NODE_SIZE.x - 30} height={NODE_SIZE.y - 30} x={-(NODE_SIZE.x - 30) / 2} y={-(NODE_SIZE.y - 30) / 2}>
        <div
          className={`flex h-full w-full flex-col items-center justify-center overflow-hidden border px-2 py-1 text-center text-[10px] leading-snug ${colorClasses}`}
        >
          {kind === 'leaf' && answerText && (
            <div className="mb-1 font-normal opacity-80">{answerText}</div>
          )}
          <div className={kind === 'leaf' ? 'font-bold' : ''}>{nodeDatum.name}</div>
        </div>
      </foreignObject>
    </g>
  )
}

export function FullDecisionTreeModal({ open, onClose, pathNodeIds, leafNodeId }: Props) {
  const data = useMemo(() => buildFullDecisionTree(), [])
  const containerRef = useRef<HTMLDivElement>(null)
  const [translate, setTranslate] = useState<Point | null>(null)

  useLayoutEffect(() => {
    if (!open || !containerRef.current) return
    const { width } = containerRef.current.getBoundingClientRect()
    setTranslate({ x: width / 2, y: 50 })
  }, [open])

  return (
    <Modal open={open} onClose={onClose} title="Full Decision Tree">
      <div ref={containerRef} className="h-[80vh] w-full">
        {translate && (
          <Tree
            data={data}
            orientation="vertical"
            pathFunc="step"
            zoomable
            draggable
            collapsible={false}
            zoom={0.45}
            scaleExtent={{ min: 0.1, max: 2 }}
            translate={translate}
            nodeSize={NODE_SIZE}
            separation={{ siblings: 1, nonSiblings: 1.2 }}
            renderCustomNodeElement={(props) => renderNode(props, pathNodeIds, leafNodeId)}
          />
        )}
      </div>
    </Modal>
  )
}
