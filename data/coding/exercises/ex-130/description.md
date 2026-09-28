# Implement Trie (Prefix Tree)

A trie (pronounced "try") is a tree data structure used to efficiently store and retrieve keys in a dataset of strings. Implement the `Trie` class:

- `Trie()` Initializes the trie object.
- `void insert(String word)` Inserts the string `word` into the trie.
- `boolean search(String word)` Returns `true` if `word` is in the trie (was inserted before), `false` otherwise.
- `boolean startsWith(String prefix)` Returns `true` if there is a previously inserted word that has `prefix` as a prefix, `false` otherwise.

**Example:**
```
Input:
["Trie", "insert", "search", "search", "startsWith", "insert", "search"]
[[], ["apple"], ["apple"], ["app"], ["app"], ["app"], ["app"]]
Output:
[null, null, true, false, true, null, true]
```

**Constraints:**
- 1 ≤ word.length, prefix.length ≤ 2000
- word and prefix consist only of lowercase English letters
- At most 3 × 10⁴ calls in total will be made to insert, search, and startsWith
