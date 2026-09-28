# Solution Approach: Hash Map + Doubly Linked List

## Pattern Recognition
→ **O(1) get + O(1) put with eviction order** — the classic combination of a hash map (for O(1) lookup) and a doubly linked list (for O(1) reordering and eviction).

## Data Structure Design
- **Doubly linked list**: maintains insertion/access order. Head (dummy) = most recently used, Tail (dummy) = least recently used.
- **Hash map** `key → Node`: allows O(1) access to any node.

## Steps

### `get(key)`
1. If `key` not in map, return `-1`.
2. Move the node to the head of the list (mark as most recently used).
3. Return `node.value`.

### `put(key, value)`
1. If `key` already in map: update `node.value`, move node to head.
2. Else:
   - Create new node; add to head and to map.
   - If `size > capacity`: remove the node at the tail (LRU), delete from map.

### List Operations (O(1))
- `removeNode(node)`: update prev/next pointers to skip `node`.
- `addToHead(node)`: insert between dummy head and current first node.

## Why This Works
The list order mirrors recency of access. The hash map gives us direct pointer access to any node, so reordering is O(1) instead of O(n).

## Complexity
- Time: O(1) for both `get` and `put`
- Space: O(capacity)