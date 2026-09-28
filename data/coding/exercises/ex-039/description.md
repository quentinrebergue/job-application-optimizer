# Find All Anagrams in a String

Given two strings `s` and `p`, return an array of all **start indices** of `p`'s anagrams in `s`. You may return them in any order.

**Example 1:**
```
Input:  s = "cbaebabacd", p = "abc"
Output: [0,6]
Explanation: s[0..2]="cba" and s[6..8]="bac" are anagrams of "abc".
```

**Example 2:**
```
Input:  s = "abab", p = "ab"
Output: [0,1,2]
```

**Constraints:**
- `1 <= s.length, p.length <= 3 × 10⁴`
- `s` and `p` consist of lowercase English letters
