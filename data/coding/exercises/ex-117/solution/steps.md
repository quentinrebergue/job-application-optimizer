# Solution Approach: Character Frequency Count

## Pattern Recognition
→ **Hash Map** — two strings are anagrams exactly when they have identical letter frequencies. Counting each string's letters into a map and comparing is faster than sorting both.

## Steps

1. If `len(s) != len(t)`, return `False` immediately.
2. Count the frequency of each character in `s` into a hash map (or a fixed-size array, since input is lowercase letters).
3. For each character in `t`, decrement its count; if any count goes negative, return `False`.
4. If the full string is processed without a mismatch, return `True`.

## Why This Works
Anagrams share the exact same multiset of characters, no more, no less. Incrementing on `s` and decrementing on `t` into the same counter means all counts return to zero exactly when both strings have identical frequencies for every character.

## Complexity
- Time: O(n)
- Space: O(1) — bounded by the alphabet size (26 lowercase letters)
