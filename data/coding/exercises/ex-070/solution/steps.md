**Pattern: DFS with Backtracking**

DFS the tree building a path string. At each leaf, add the path to results. Pass current path down recursively, appending `->node.val` at each step.
