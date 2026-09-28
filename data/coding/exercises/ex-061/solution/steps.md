**Pattern: Monotonic Stack**

Process nums2 with a decreasing monotonic stack. When a larger element is found, it's the answer for everything on the stack smaller than it. Store results in a map, then look up nums1 elements.
