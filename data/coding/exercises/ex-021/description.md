# Minimum Window Substring

Given two strings `s` and `t`, return the **minimum window substring** of `s` such that every character in `t` (including duplicates) is included in the window. If no such substring exists, return `""`.

The answer is guaranteed to be unique.

**Example 1:**
```
Input:  s = "ADOBECODEBANC", t = "ABC"
Output: "BANC"
```

**Example 2:**
```
Input:  s = "a", t = "a"
Output: "a"
```

**Example 3:**
```
Input:  s = "a", t = "aa"
Output: ""
Explanation: t requires two 'a's, but s only has one.
```

**Constraints:**
- `m == s.length`, `n == t.length`
- `1 <= m, n <= 10⁵`
- `s` and `t` consist of uppercase and lowercase English letters

**Follow-up:** O(m + n) algorithm?
