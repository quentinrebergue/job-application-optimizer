'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, Plus, Trash2, Tag, X } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import type { Taxonomy, TaxonomyNode } from '@/types'

function buildTree(nodes: TaxonomyNode[]): TaxonomyNode[] {
  return nodes.filter((n) => n.parent === null)
}

function getChildren(parentId: string, nodes: TaxonomyNode[]): TaxonomyNode[] {
  return nodes.filter((n) => n.parent === parentId)
}

function AliasChip({ alias, onRemove }: { alias: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 border border-slate-200">
      {alias}
      <button onClick={onRemove} className="text-slate-400 hover:text-red-500 transition-colors">
        <X size={10} />
      </button>
    </span>
  )
}

function NodeRow({
  node, allNodes, depth, selected, onSelect, onDelete,
}: { node: TaxonomyNode; allNodes: TaxonomyNode[]; depth: number; selected: string | null; onSelect: (id: string) => void; onDelete: (id: string, cascade: boolean) => void }) {
  const [open, setOpen] = useState(depth < 1)
  const children = getChildren(node.id, allNodes)
  const hasChildren = children.length > 0
  const isSelected = selected === node.id

  return (
    <div>
      <div
        className={['flex items-center gap-1.5 rounded-lg px-2 py-1.5 cursor-pointer group transition-colors', isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'].join(' ')}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(node.id)}
      >
        <button onClick={(e) => { e.stopPropagation(); setOpen(!open) }} className="shrink-0 text-slate-400 hover:text-slate-600 w-4">
          {hasChildren ? (open ? <ChevronDown size={12} /> : <ChevronRight size={12} />) : <span className="w-3 inline-block" />}
        </button>
        <span className="flex-1 text-sm font-medium text-slate-800 truncate">{node.label}</span>
        <span className="text-xs text-slate-400 shrink-0">{node.aliases.length} aliases</span>
        <button onClick={(e) => { e.stopPropagation(); onDelete(node.id, hasChildren) }} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all shrink-0">
          <Trash2 size={12} />
        </button>
      </div>

      {open && hasChildren && (
        <div>
          {children.map((child) => (
            <NodeRow key={child.id} node={child} allNodes={allNodes} depth={depth + 1} selected={selected} onSelect={onSelect} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  )
}

interface Props { initialTaxonomy: Taxonomy }

export function TaxonomyClient({ initialTaxonomy }: Props) {
  const [taxonomy, setTaxonomy] = useState<Taxonomy>(initialTaxonomy)
  const [selected, setSelected] = useState<string | null>(null)
  const [newAlias, setNewAlias] = useState('')
  const [addingNode, setAddingNode] = useState(false)
  const [newNodeLabel, setNewNodeLabel] = useState('')
  const [saving, setSaving] = useState(false)

  const reload = async () => {
    const data = await fetch('/api/taxonomy').then((r) => r.json())
    setTaxonomy(data)
  }

  const selectedNode = taxonomy.nodes.find((n) => n.id === selected) ?? null
  const roots = buildTree(taxonomy.nodes)

  async function addAlias() {
    if (!selected || !newAlias.trim()) return
    setSaving(true)
    await fetch(`/api/taxonomy/nodes/${selected}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_alias', alias: newAlias.trim() }),
    })
    setNewAlias('')
    await reload()
    setSaving(false)
  }

  async function removeAlias(alias: string) {
    if (!selected) return
    await fetch(`/api/taxonomy/nodes/${selected}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove_alias', alias }),
    })
    await reload()
  }

  async function addChildNode() {
    if (!newNodeLabel.trim()) return
    setSaving(true)
    await fetch('/api/taxonomy/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newNodeLabel.trim(), parent: selected }),
    })
    setNewNodeLabel('')
    setAddingNode(false)
    await reload()
    setSaving(false)
  }

  async function deleteNode(id: string, hasChildren: boolean) {
    const cascade = hasChildren ? window.confirm('This node has children. Delete them all?') : true
    if (!cascade && hasChildren) return
    await fetch(`/api/taxonomy/nodes/${id}${hasChildren ? '?cascade=true' : ''}`, { method: 'DELETE' })
    if (selected === id) setSelected(null)
    await reload()
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <PageHeader title="Tag Taxonomy" subtitle="Hierarchical tag tree used for intelligent entity ranking and Q&A matching." />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-700">{taxonomy.nodes.length} nodes</span>
            <button onClick={() => { setSelected(null); setAddingNode(true) }} className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">
              <Plus size={13} /> Add root node
            </button>
          </div>
          <div className="p-2 max-h-[70vh] overflow-y-auto">
            {roots.map((node) => (
              <NodeRow key={node.id} node={node} allNodes={taxonomy.nodes} depth={0} selected={selected} onSelect={setSelected} onDelete={deleteNode} />
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {addingNode && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-800 mb-2">
                New {selected ? `child of "${selectedNode?.label ?? selected}"` : 'root node'}
              </p>
              <input
                autoFocus
                value={newNodeLabel}
                onChange={(e) => setNewNodeLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addChildNode() }}
                placeholder="Node label…"
                className="w-full rounded-lg border border-blue-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white mb-2"
              />
              <div className="flex gap-2">
                <button onClick={addChildNode} disabled={saving || !newNodeLabel.trim()} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Adding…' : 'Add'}
                </button>
                <button onClick={() => { setAddingNode(false); setNewNodeLabel('') }} className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {selectedNode ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">{selectedNode.label}</h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedNode.id}</p>
                </div>
                <button onClick={() => { setAddingNode(true) }} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-2 py-1">
                  <Plus size={11} /> Child node
                </button>
              </div>

              {selectedNode.parent && (
                <p className="text-xs text-slate-500">
                  Parent: <span className="font-medium text-slate-700">{taxonomy.nodes.find((n) => n.id === selectedNode.parent)?.label ?? selectedNode.parent}</span>
                </p>
              )}

              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Tag size={12} className="text-slate-400" />
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tag Aliases</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
                  {selectedNode.aliases.length === 0 && <span className="text-xs text-slate-400 italic">No aliases yet</span>}
                  {selectedNode.aliases.map((a) => (
                    <AliasChip key={a} alias={a} onRemove={() => removeAlias(a)} />
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newAlias}
                    onChange={(e) => setNewAlias(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addAlias() }}
                    placeholder="Add tag alias…"
                    className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button onClick={addAlias} disabled={saving || !newAlias.trim()} className="px-3 py-1 rounded-lg bg-slate-800 text-white text-xs font-medium hover:bg-slate-700 disabled:opacity-50">
                    Add
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">
              Select a node to edit its aliases
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Tree stats</p>
            <dl className="space-y-1.5">
              {[['Root nodes', String(roots.length)], ['Total nodes', String(taxonomy.nodes.length)], ['Total aliases', String(taxonomy.nodes.reduce((s, n) => s + n.aliases.length, 0))]].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="font-medium text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
