# Permutation in String

Given two strings `s1` and `s2`, return `true` if `s2` contains **a permutation of `s1`**, or `false` otherwise.

In other words, return `true` if one of `s1`'s permutations is a substring of `s2`.

**Example 1:**
```
Input:  s1 = "ab", s2 = "eidbaooo"
Output: true
Explanation: s2 contains "ba", a permutation of "ab".
```

**Example 2:**
```
Input:  s1 = "ab", s2 = "eidboaoo"
Output: false
```

**Constraints:**
- `1 <= s1.length, s2.length <= 10⁴`
- `s1` and `s2` consist of lowercase English letters

> **Relation to ex-039:** This is the boolean version of Find All Anagrams. Return `true` as soon as any anagram is found.
