# Greedy Algorithms

## Concept
Make the locally optimal choice at each step, trusting it will lead to a globally optimal solution. Greedy is faster than DP but only correct when the problem has the **greedy choice property**.

## When Greedy Works
- **Exchange argument**: any non-greedy solution can be improved by swapping toward the greedy choice without making it worse → greedy is optimal.
- **Matroid structure**: the problem has independent sets closed under subset (formal criterion).
- If you can't prove it, try DP instead.

## Common Patterns

### Sort + Scan
Sort by some key, then make decisions in order.
```text
Interval scheduling: sort by end time, greedily select non-overlapping intervals.
```

### Frequency-Based Scheduling
Build a schedule around the most frequent task — it dictates the minimum gaps.

### Two-Pointer Greedy
Sort, use left/right pointers to exploit ordering.

### Lookup Table (Denominations)

```cpp
vector<pair<int,string>> table = {
    {1000,"M"},{900,"CM"},{500,"D"},{400,"CD"},
    {100,"C"},{90,"XC"},{50,"L"},{40,"XL"},
    {10,"X"},{9,"IX"},{5,"V"},{4,"IV"},{1,"I"}
};
string intToRoman(int num) {
    string res;
    for (auto& [val, sym] : table)
        while (num >= val) { res += sym; num -= val; }
    return res;
}
```

## Greedy vs DP
| | Greedy | DP |
|--|--------|-----|
| Speed | Faster | Slower |
| Correctness | Only when property holds | Always correct |
| Space | O(1) typical | O(n) or O(n²) |

## Classic Problems
- Integer to Roman, Jump Game, Interval Scheduling, Task Scheduler, Bag of Tokens, Gas Station
