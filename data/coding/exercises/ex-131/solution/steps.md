# Solution Approach: Trie + DFS for Wildcard Matching

## Pattern Recognition
→ **Other (Trie)** — words are stored in a trie like Implement Trie. The twist is the `.` wildcard: when the search hits a dot, it must try *every* child branch at that position, which is naturally expressed as a small DFS over the trie.

## Steps

1. `add_word`: identical to a plain trie insert.
2. `search(word)`, via `dfs(node, i)`:
   - If `i == len(word)`, return whether `node` marks the end of a word.
   - If `word[i]` is a normal letter, follow that specific child (or fail if it doesn't exist).
   - If `word[i]` is `'.'`, try `dfs` on *every* child of `node` — return `True` if any of them succeeds.
3. Call `dfs(root, 0)`.

## Why This Works
A `.` doesn't pick a specific branch — it means "any letter could work here," so the search must explore all of them, backtracking to try the next child whenever one fails. Because a trie only ever has as many children as distinct letters (≤ 26), branching on a dot stays bounded even in the worst case.

## Complexity
- Time: O(26^d × L) worst case, where d is the number of dots and L is the word length (bounded by the small dot count in practice)
- Space: O(total characters inserted) for the trie
