class LRUNode:
    def __init__(self, key: int, value: int):
        self.key = key
        self.value = value
        self.prev: 'LRUNode | None' = None
        self.next: 'LRUNode | None' = None


class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.map: dict[int, LRUNode] = {}
        self.head = LRUNode(0, 0)  # dummy MRU sentinel
        self.tail = LRUNode(0, 0)  # dummy LRU sentinel
        self.head.next = self.tail
        self.tail.prev = self.head

    def get(self, key: int) -> int:
        node = self.map.get(key)
        if not node:
            return -1
        self._remove(node)
        self._add_to_head(node)
        return node.value

    def put(self, key: int, value: int) -> None:
        existing = self.map.get(key)
        if existing:
            existing.value = value
            self._remove(existing)
            self._add_to_head(existing)
        else:
            node = LRUNode(key, value)
            self.map[key] = node
            self._add_to_head(node)
            if len(self.map) > self.capacity:
                lru = self.tail.prev
                self._remove(lru)
                del self.map[lru.key]

    def _remove(self, node: 'LRUNode') -> None:
        node.prev.next = node.next
        node.next.prev = node.prev

    def _add_to_head(self, node: 'LRUNode') -> None:
        node.next = self.head.next
        node.prev = self.head
        self.head.next.prev = node
        self.head.next = node
