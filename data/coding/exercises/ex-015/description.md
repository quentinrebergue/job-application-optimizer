# Integer to Roman

Seven symbols represent Roman numerals:

| Symbol | Value |
|--------|-------|
| I | 1 |
| V | 5 |
| X | 10 |
| L | 50 |
| C | 100 |
| D | 500 |
| M | 1000 |

Rules:
- Append the symbol of the maximal value that can be subtracted from the input.
- Use subtractive forms for 4 and 9: IV, IX, XL, XC, CD, CM.
- Powers of 10 (I, X, C, M) can appear at most 3 times consecutively.

Given an integer `num`, convert it to a Roman numeral.

**Example 1:**
```
Input:  num = 3749
Output: "MMMDCCXLIX"
```

**Example 2:**
```
Input:  num = 58
Output: "LVIII"
```

**Example 3:**
```
Input:  num = 1994
Output: "MCMXCIV"
```

**Constraints:**
- `1 <= num <= 3999`