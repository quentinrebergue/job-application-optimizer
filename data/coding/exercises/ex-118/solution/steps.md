# Solution Approach: Bucket by Sorted-Letters Key

## Pattern Recognition
→ **Hash Map** — all anagrams of each other produce the same string when their letters are sorted. Use that sorted string as a hash map key to bucket words together in one pass.

## Steps

1. Create an empty hash map `groups: sorted-key -> list of original words`.
2. For each word in `strs`, compute `key = ''.join(sorted(word))`.
3. Append the original word to `groups[key]` (creating the bucket if it doesn't exist yet).
4. Return `list(groups.values())`.

## Why This Works
Two words are anagrams exactly when they contain the same letters, and sorting a string is a canonical, order-independent representation of "which letters, how many of each" — so identical sorted forms guarantee identical letter multisets, and vice versa.

## Complexity
- Time: O(n × k log k), where k is the max word length (sorting each word)
- Space: O(n × k)
