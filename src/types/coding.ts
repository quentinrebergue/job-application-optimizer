// Coding interview trainer types — exercise bank + knowledge bank

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface KnowledgeMeta {
  id: string
  name: string
  category: string
  /** Taxonomy tag aliases for this knowledge item */
  tags: string[]
}

export interface KnowledgeItem extends KnowledgeMeta {
  /** Full markdown explanation */
  explanation: string
}

export interface ExerciseMeta {
  id: string
  title: string
  difficulty: Difficulty
  knowledge_ids: string[]
  /** Taxonomy tag aliases for this exercise */
  tags: string[]
  /** Pattern category (e.g. "Sliding Window", "Dynamic Programming") — must match a `Pattern` from `@/config/decisionTree` to power the decision tree view */
  category?: string
  /** LeetCode problem number */
  leetcode?: number
  /** Per-node overrides for the decision-tree justification text, keyed by node id (falls back to the node's generic justification) */
  patternJustifications?: Record<string, string>
}

export interface Exercise extends ExerciseMeta {
  /** Markdown problem statement */
  description: string
  solution: {
    /** Markdown step-by-step approach */
    steps: string
    /** Python solution code */
    code: string
  }
}

export interface CodingTestSession {
  total: Exercise[]
  queue: Exercise[]
  correctCount: number
}
