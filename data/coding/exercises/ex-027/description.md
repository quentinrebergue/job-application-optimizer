# Wildcard Matching

Given an input string `s` and a pattern `p`, implement wildcard pattern matching with support for:
- `'?'` — matches any **single** character
- `'*'` — matches any **sequence** of characters (including empty)

The matching must cover the **entire** input string.

**Example 1:**
```
Input:  s = "aa", p = "a"
Output: false
```

**Example 2:**
```
Input:  s = "aa", p = "*"
Output: true
```

**Example 3:**
```
Input:  s = "cb", p = "?a"
Output: false
Explanation: '?' matches 'c', but 'a' ≠ 'b'.
```

**Constraints:**
- `0 <= s.length, p.length <= 2000`
- `s` contains only lowercase English letters
- `p` contains lowercase English letters, `'?'` or `'*'`
