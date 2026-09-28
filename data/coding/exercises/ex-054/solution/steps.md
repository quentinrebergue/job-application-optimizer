**Pattern: Two Pointers (Greedy)**

Start with widest container (l=0, r=end). Area = min(height[l], height[r]) × (r-l). Move the pointer with the shorter line inward — the width decreases, so we need a taller line to improve.
