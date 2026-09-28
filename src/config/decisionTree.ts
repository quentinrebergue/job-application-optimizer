// Pattern-recognition decision tree — a single shared template walked by every
// exercise. Each exercise points at one leaf (its `category`); the path from
// `root` to that leaf is computed on the fly and rendered with a
// justification per node (exercise override, falling back to the node's
// generic `justification`).

export const PATTERNS = [
  'Sliding Window',
  'Two Pointers',
  'Fast & Slow Pointers',
  'Binary Search',
  'Prefix Sum',
  'Hash Map',
  'Stack',
  'Monotonic Stack',
  'Top K / Heap',
  'Intervals',
  'Linked List Reversal',
  'Matrix Traversal',
  'Binary Tree',
  'BFS',
  'DFS',
  'Backtracking',
  'Dynamic Programming',
  'Greedy',
  'Other',
] as const

export type Pattern = (typeof PATTERNS)[number]

export interface DecisionNode {
  id: string
  parentId: string | null
  /** Question asked at this node. Absent on leaves. */
  question?: string
  /** Label of the branch taken from the parent to reach this node. Absent on root. */
  answer?: string
  /** Generic default justification for why this branch applies, shown unless the exercise overrides it. */
  justification: string
  /** Set only on leaf nodes. */
  pattern?: Pattern
}

export const DECISION_TREE: DecisionNode[] = [
  {
    id: 'root',
    parentId: null,
    question: 'What is the primary shape of the problem?',
    justification: 'Start by classifying what the problem is fundamentally asking for.',
  },

  // ── Branch A: position/range within a sequence ──────────────────────────
  {
    id: 'a-root',
    parentId: 'root',
    answer: 'Find a contiguous range or specific position(s) within a sequence',
    question: 'Is it a contiguous run with a size/property constraint you grow or shrink?',
    justification:
      'The problem talks about a subarray/substring, or about indices moving through a sequence (array, string, or linked list).',
  },
  {
    id: 'a-window',
    parentId: 'a-root',
    answer: 'Yes — expand/shrink a window to satisfy a constraint',
    justification:
      'Signal words: "longest/shortest substring", "longest/shortest subarray", or "smallest window containing X" — the answer is always a single contiguous run, found by growing/shrinking two ends together.',
    pattern: 'Sliding Window',
  },
  {
    id: 'a-not-window',
    parentId: 'a-root',
    answer: 'No — not a growing/shrinking window',
    question: 'Do you need running/cumulative sums over ranges?',
    justification: 'Rule out prefix sums before considering pointer or search techniques.',
  },
  {
    id: 'a-prefix',
    parentId: 'a-not-window',
    answer: 'Yes — cumulative range sums',
    justification:
      'Precomputing prefix sums turns range-sum queries into O(1) subtractions. Reach for this over Sliding Window when negative numbers are allowed (a window can no longer grow/shrink monotonically) or the problem counts *all* subarrays matching a sum, not just the best contiguous run.',
    pattern: 'Prefix Sum',
  },
  {
    id: 'a-not-prefix',
    parentId: 'a-not-window',
    answer: 'No',
    question: 'Do two indices move toward/away from each other (sorted array, palindrome, list dedup)?',
    justification: 'Two-pointer techniques apply when both ends of the sequence carry useful information.',
  },
  {
    id: 'a-two-pointers',
    parentId: 'a-not-prefix',
    answer: 'Yes',
    justification: 'Two indices scan from complementary positions, each carrying information the other needs.',
    pattern: 'Two Pointers',
  },
  {
    id: 'a-binary-search',
    parentId: 'a-not-prefix',
    answer: 'No — I repeatedly halve a sorted/monotonic search space',
    justification: 'The search space is sorted or monotonic, so each comparison discards half the candidates.',
    pattern: 'Binary Search',
  },

  // ── Branch B: structural traversal (linked list, grid, tree, graph) ────
  {
    id: 'b-root',
    parentId: 'root',
    answer: 'Traverse or rewire a structure (linked list, grid, tree, graph)',
    question: 'What structure are you operating on?',
    justification:
      "The problem is about walking or restructuring a data structure itself, not just finding a range or position.",
  },
  {
    id: 'b-list',
    parentId: 'b-root',
    answer: 'Linked list',
    question: 'Are you rewiring the list’s `next` pointers to reverse it?',
    justification:
      'A singly linked list has no backward/random access, so it splits into exactly two families: rewiring pointers (reversal) vs. walking forward with node references (everything else).',
  },
  {
    id: 'b-reversal',
    parentId: 'b-list',
    answer: 'Yes — reverse all or part of the list',
    justification: 'Rewiring `next` pointers in place reverses the list without extra space.',
    pattern: 'Linked List Reversal',
  },
  {
    id: 'b-fast-slow',
    parentId: 'b-list',
    answer: 'No — using node references together to track a cycle, midpoint, gap, or adjacent pair',
    justification:
      'Because you can’t step backward in a singly linked list, ANY technique that walks it with two node references — same speed with a gap (Nth-from-end), different speeds (cycle/midpoint), or a prev/curr pair (skipping duplicates) — falls under Fast & Slow Pointers, not Two Pointers. "Two Pointers" is reserved for arrays/strings, where both ends are reachable at once.',
    pattern: 'Fast & Slow Pointers',
  },
  {
    id: 'b-grid',
    parentId: 'b-root',
    answer: '2D grid / matrix',
    justification: 'Flood fill, region counting, rotation, and spiral problems all traverse a grid in place.',
    pattern: 'Matrix Traversal',
  },
  {
    id: 'b-tree',
    parentId: 'b-root',
    answer: 'Binary tree',
    justification: 'Binary trees get their own bucket since most traversals are simple recursive DFS variants.',
    pattern: 'Binary Tree',
  },
  {
    id: 'b-graph',
    parentId: 'b-root',
    answer: 'General graph or tree (not a plain binary tree)',
    question: 'Do you need the shortest path or a level-by-level exploration?',
    justification: 'Shortest-path / level-order needs favor BFS; general exploration favors DFS.',
  },
  {
    id: 'b-bfs',
    parentId: 'b-graph',
    answer: 'Yes — shortest path or level order',
    justification: 'Exploring layer by layer guarantees the first time you reach a node is via the shortest path.',
    pattern: 'BFS',
  },
  {
    id: 'b-dfs',
    parentId: 'b-graph',
    answer: 'No — explore all reachable nodes, connectivity, or ordering',
    justification: 'Diving as deep as possible before backtracking is the natural way to visit everything reachable.',
    pattern: 'DFS',
  },

  // ── Branch C: auxiliary structure to answer lookup/order queries ───────
  {
    id: 'c-root',
    parentId: 'root',
    answer: 'Track elements to answer lookup, order, or priority queries',
    question: 'What do you need to track as you scan?',
    justification: 'The problem needs an auxiliary structure beyond the input itself to answer queries efficiently.',
  },
  {
    id: 'c-hashmap',
    parentId: 'c-root',
    answer: 'Fast O(1) lookup, frequency counting, or caching',
    justification: 'A hash map trades space for O(1) average lookup/insert, avoiding a nested scan.',
    pattern: 'Hash Map',
  },
  {
    id: 'c-monotonic',
    parentId: 'c-root',
    answer: 'Next greater/smaller element, or keep a monotonic order',
    justification: 'A stack that only ever grows in one direction lets you pop stale elements in O(1) amortized.',
    pattern: 'Monotonic Stack',
  },
  {
    id: 'c-stack',
    parentId: 'c-root',
    answer: 'Matching / undo in LIFO order (parentheses, expression evaluation)',
    justification: 'The most recent unmatched item is always the next one to resolve — classic LIFO.',
    pattern: 'Stack',
  },
  {
    id: 'c-heap',
    parentId: 'c-root',
    answer: 'K largest/smallest/most-frequent, or merge sorted streams',
    justification: 'A heap keeps the current best-K (or next-smallest) accessible in O(log n) per operation.',
    pattern: 'Top K / Heap',
  },
  {
    id: 'c-intervals',
    parentId: 'c-root',
    answer: 'Ranges/meetings that may overlap and need merging or scheduling',
    justification: 'Sorting by start (or end) time turns overlap checks into a single linear sweep.',
    pattern: 'Intervals',
  },

  // ── Branch D: optimization over multiple choices ───────────────────────
  {
    id: 'd-root',
    parentId: 'root',
    answer: 'Explore many possible choices to optimize a value, count outcomes, or enumerate every valid result',
    question: 'What exactly are you looking for: one optimal value, or every valid outcome?',
    justification:
      'The problem is built from a sequence of choices — but the goal might be a single best number, a count, or literally all combinations/permutations, and each goal points to a different pattern.',
  },
  {
    id: 'd-backtracking',
    parentId: 'd-root',
    answer: 'Every valid combination or permutation — I must enumerate or count them all',
    justification:
      'This is really DFS over an implicit tree of choices — reach for Backtracking whenever the problem says "all subsets/permutations/combinations", undoing invalid partial choices as you go.',
    pattern: 'Backtracking',
  },
  {
    id: 'd-optimum',
    parentId: 'd-root',
    answer: 'A single optimal value or count',
    question: 'How do you reach that one optimal value?',
    justification:
      'Once you know you only need one best answer — not every combination — the next question is whether a greedy, irreversible choice is safe, or whether you must weigh overlapping sub-problems.',
  },
  {
    id: 'd-dp',
    parentId: 'd-optimum',
    answer: 'Overlapping sub-problems — I must remember previous results to avoid recomputing',
    justification: 'Caching results for each sub-problem (memoization/tabulation) avoids exponential recomputation.',
    pattern: 'Dynamic Programming',
  },
  {
    id: 'd-greedy',
    parentId: 'd-optimum',
    answer: 'A locally best choice at each step is always globally optimal',
    justification:
      'No backtracking needed — committing to the best immediate option never hurts the final result. Test: if you can picture a counter-example where the greedy choice backfires, it is not actually greedy-safe — that is a sign it is DP instead.',
    pattern: 'Greedy',
  },

  // ── Branch E: none of the above ─────────────────────────────────────────
  {
    id: 'e-other',
    parentId: 'root',
    answer: 'None of the above — a math trick, ML implementation, or system-design question',
    justification: 'Not every interview question maps to a classic pattern — some are conceptual or design-oriented.',
    pattern: 'Other',
  },
]

const NODES_BY_ID = new Map(DECISION_TREE.map((n) => [n.id, n]))

/** Root-to-leaf path for the first leaf matching `pattern`. */
export function getDecisionPath(pattern: Pattern): DecisionNode[] {
  const leaf = DECISION_TREE.find((n) => n.pattern === pattern)
  if (!leaf) return []
  const path: DecisionNode[] = []
  let current: DecisionNode | undefined = leaf
  while (current) {
    path.unshift(current)
    current = current.parentId ? NODES_BY_ID.get(current.parentId) : undefined
  }
  return path
}

/**
 * Other patterns ruled out at the final branching node — the leaf's sibling
 * leaves under the same parent. Non-leaf siblings (whole sub-branches) are
 * skipped since they don't map to a single pattern to contrast against.
 */
export function getRuledOutAlternatives(pattern: Pattern): DecisionNode[] {
  const leaf = DECISION_TREE.find((n) => n.pattern === pattern)
  if (!leaf || !leaf.parentId) return []
  return DECISION_TREE.filter(
    (n) => n.parentId === leaf.parentId && n.id !== leaf.id && n.pattern
  )
}

/** Direct children of a node, in declaration order. */
export function getChildren(nodeId: string): DecisionNode[] {
  return DECISION_TREE.filter((n) => n.parentId === nodeId)
}

/**
 * Hierarchical shape consumed by `react-d3-tree` (structurally compatible
 * with its `RawNodeDatum`). Mirrors the per-exercise diagram's layout: every
 * branching node is rendered as an answer/leaf square, followed by a
 * synthetic "question" square wrapping its own children.
 */
export interface DecisionTreeVizNode {
  name: string
  attributes: { nodeId: string; kind: 'question' | 'answer' | 'leaf'; answer: string }
  children?: DecisionTreeVizNode[]
}

function buildAnswerVizNode(node: DecisionNode): DecisionTreeVizNode {
  const children = getChildren(node.id)
  return {
    name: node.pattern ?? node.answer ?? node.id,
    attributes: { nodeId: node.id, kind: node.pattern ? 'leaf' : 'answer', answer: node.answer ?? '' },
    children: children.length > 0 ? [buildQuestionVizNode(node)] : undefined,
  }
}

function buildQuestionVizNode(node: DecisionNode): DecisionTreeVizNode {
  return {
    name: node.question ?? '',
    attributes: { nodeId: `${node.id}__q`, kind: 'question', answer: '' },
    children: getChildren(node.id).map(buildAnswerVizNode),
  }
}

/** The full template tree (all branches, not just one exercise's path), rooted at the initial question. */
export function buildFullDecisionTree(): DecisionTreeVizNode {
  const root = NODES_BY_ID.get('root')
  if (!root) throw new Error('decision tree root missing')
  return buildQuestionVizNode(root)
}
