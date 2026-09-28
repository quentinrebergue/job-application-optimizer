# Solution Approach: Expand Around Every Center

## Pattern Recognition
→ **Two Pointers** — same expand-around-center technique as Longest Palindromic Substring, but here every successful expansion is counted instead of just tracking the longest one. Every palindrome has a unique center (a character, for odd length, or a gap between two characters, for even length).

## Steps

1. Initialize `count = 0`.
2. For each index `i` in `s`:
   - `expand(i, i)` — odd-length palindromes centered on a single character.
   - `expand(i, i + 1)` — even-length palindromes centered between two characters.
3. `expand(l, r)`: while `l >= 0`, `r < len(s)`, and `s[l] == s[r]`, increment `count`, then `l -= 1`, `r += 1`.
4. Return `count`.

## Why This Works
Every palindromic substring has exactly one center point (a single character or a gap between two), so trying all `2n - 1` possible centers and expanding outward from each finds every palindrome exactly once, without re-deriving overlapping ones.

## Complexity
- Time: O(n²) — n centers, each expanding up to O(n)
- Space: O(1)
