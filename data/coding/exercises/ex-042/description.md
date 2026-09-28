# Fruit Into Baskets

You visit a farm with a single row of fruit trees. Each `fruits[i]` is the type of fruit tree `i` produces. You have **two baskets**, each holding only **one type** of fruit (unlimited quantity).

Starting from any tree, pick exactly one fruit per tree moving right. Stop when the next tree's fruit doesn't fit in either basket.

Return the **maximum number of fruits** you can pick.

**Example 1:**
```
Input:  fruits = [1,2,1]
Output: 3
```

**Example 2:**
```
Input:  fruits = [0,1,2,2]
Output: 3  (pick [1,2,2])
```

**Example 3:**
```
Input:  fruits = [1,2,3,2,2]
Output: 4  (pick [2,3,2,2])
```

**Constraints:**
- `1 <= fruits.length <= 10⁵`
- `0 <= fruits[i] < fruits.length`

> **Reframe:** Longest subarray with at most 2 distinct values.
