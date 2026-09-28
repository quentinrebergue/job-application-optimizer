# Gas Station

There are `n` gas stations along a circular route. `gas[i]` is the gas available at station `i`. `cost[i]` is the gas needed to travel from station `i` to station `i+1`.

Starting with an empty tank at one station, return the **starting station index** from which you can complete the circuit, or `-1` if impossible. The solution is guaranteed to be unique.

**Example 1:**
```
Input:  gas  = [1,2,3,4,5]
        cost = [3,4,5,1,2]
Output: 3
```

**Example 2:**
```
Input:  gas  = [2,3,4]
        cost = [3,4,3]
Output: -1
```

**Constraints:**
- `n == gas.length == cost.length`
- `1 <= n <= 10⁵`
- `0 <= gas[i], cost[i] <= 10⁴`
