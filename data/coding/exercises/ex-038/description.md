# Longest Repeating Character Replacement

You are given a string `s` and an integer `k`. You can choose any character and change it to any other uppercase English character, **at most `k` times**.

Return the length of the **longest substring** containing the same letter after performing the above operations.

**Example 1:**
```
Input:  s = "ABAB", k = 2
Output: 4
Explanation: Replace both 'A's with 'B's → "BBBB".
```

**Example 2:**
```
Input:  s = "AABABBA", k = 1
Output: 4
Explanation: Replace the middle 'A' → "AABBBBA"; longest is "BBBB" (length 4).
```

**Constraints:**
- `1 <= s.length <= 10⁵`
- `s` consists of uppercase English letters only
- `0 <= k <= s.length`
