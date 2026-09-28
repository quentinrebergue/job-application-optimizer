# LRU Cache

Design a data structure that follows the constraints of a **Least Recently Used (LRU) cache**.

Implement the `LRUCache` class:
- `LRUCache(capacity)` — initialize the LRU cache with a positive size `capacity`
- `get(key)` — return the value of the `key` if it exists, otherwise return `-1`
- `put(key, value)` — update the value of the key if it exists. Otherwise, add the key-value pair. If the cache reaches its capacity, evict the least recently used key before inserting.

Both `get` and `put` must run in **O(1)** average time.

**Example:**
```
LRUCache lru = new LRUCache(2);
lru.put(1, 1);   // cache: {1=1}
lru.put(2, 2);   // cache: {1=1, 2=2}
lru.get(1);      // return 1,  cache: {2=2, 1=1}
lru.put(3, 3);   // evicts key 2, cache: {1=1, 3=3}
lru.get(2);      // return -1 (not found)
lru.put(4, 4);   // evicts key 1, cache: {3=3, 4=4}
lru.get(1);      // return -1
lru.get(3);      // return 3
lru.get(4);      // return 4
```

**Constraints:**
- 1 ≤ capacity ≤ 3000
- 0 ≤ key ≤ 10⁴
- 0 ≤ value ≤ 10⁵
- At most 2 × 10⁵ calls will be made to `get` and `put`