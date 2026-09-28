**Pattern: Multi-source BFS**

Seed the queue with all initially rotten oranges. BFS layer by layer — each layer = 1 minute. Track fresh count; if any fresh remain after BFS, return -1.
