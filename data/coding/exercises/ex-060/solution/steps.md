**Pattern: Linked List Manipulation**

Use a dummy node. For each pair: save `first`, `second`, `next_pair`. Relink: dummy→second→first→next_pair. Then recurse/iterate on next_pair.
