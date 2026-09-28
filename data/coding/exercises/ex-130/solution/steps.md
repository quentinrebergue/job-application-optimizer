# Solution Approach: Nested Hash Maps as Trie Nodes

## Pattern Recognition
→ **Other (Trie)** — a trie isn't covered by the classic array/graph/DP patterns; it's its own dedicated structure. Each node is a map from character to child node, plus a flag marking "a word ends here."

## Steps

1. Each `TrieNode` holds `children: dict[str, TrieNode]` and `is_end: bool`.
2. `insert(word)`: walk from the root, creating a child node for each character not yet present; mark `is_end = True` on the final node.
3. `search(word)`: walk the same way, following existing children; if any character is missing, return `False`. If the walk completes, return the final node's `is_end`.
4. `starts_with(prefix)`: identical walk to `search`, but return `True` as soon as the walk completes — no need to check `is_end`, since a prefix doesn't have to be a complete word.

## Why This Works
Every word inserted shares its node path with any other word that has the same prefix, so common prefixes are only ever stored once. Walking character-by-character from the root either finds an exact node path (confirming the prefix/word exists) or hits a missing child (confirming it doesn't) — both in time proportional to the query length, not the number of stored words.

## Complexity
- Time: O(L) per operation, where L is the word/prefix length
- Space: O(total characters across all inserted words) in the worst case (no shared prefixes)
