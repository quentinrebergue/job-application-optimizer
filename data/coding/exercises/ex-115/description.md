# Decode Ways

A message containing letters `A-Z` is encoded using the mapping `'A' -> "1", 'B' -> "2", ..., 'Z' -> "26"`.

Given a string `s` containing only digits, return the number of ways to decode it. Return `0` if it cannot be decoded at all.

**Example 1:**
```
Input: s = "12"
Output: 2
Explanation: "12" could be decoded as "AB" (1 2) or "L" (12).
```

**Example 2:**
```
Input: s = "226"
Output: 3
Explanation: "226" could be decoded as "BZ" (2 26), "VF" (22 6), or "BBF" (2 2 6).
```

**Example 3:**
```
Input: s = "06"
Output: 0
Explanation: "06" cannot be mapped to "F" because of the leading zero ("6" is different from "06").
```

**Constraints:**
- 1 ≤ s.length ≤ 100
- s consists of digits only
