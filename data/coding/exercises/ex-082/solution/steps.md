**Pattern: Backtracking**

At each index, decide: include it or not. Recurse from next index. Add a copy of current subset to results at every call (not just leaves). O(2^n) subsets.
