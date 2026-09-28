# Solution Approach: Greedy Lookup Table

## Pattern Recognition
→ **Greedy** — at each step subtract the largest possible Roman value. The lookup table includes all special subtractive forms.

## Steps

1. Build the lookup table in descending order:
   `[(1000,'M'),(900,'CM'),(500,'D'),(400,'CD'),(100,'C'),(90,'XC'),(50,'L'),(40,'XL'),(10,'X'),(9,'IX'),(5,'V'),(4,'IV'),(1,'I')]`

2. Initialize `result = ""`.

3. For each `(value, symbol)` pair:
   - While `num >= value`: append `symbol` to result, subtract `value` from `num`.

4. Return `result`.

## Why This Works
The subtractive forms (IV, IX, XL, XC, CD, CM) are treated as atomic units in the lookup table. Greedy always picks the highest-value symbol that fits, which matches the Roman numeral construction rules.

## Complexity
- Time: O(1) — at most 3999 iterations, bounded constant
- Space: O(1)
