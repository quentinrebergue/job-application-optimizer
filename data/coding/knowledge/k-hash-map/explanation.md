# Hash Map Lookup

## Concept
Use a hash map to trade space for time. Store previously seen values (or their indices/counts) so you can answer "have I seen X before?" in O(1) instead of scanning the array in O(n).

## When to Use
- "Two Sum" style problems — find pairs that satisfy a condition
- Counting frequencies
- Detecting duplicates
- Caching computed results for quick retrieval

## Classic Pattern: Two Sum

```cpp
vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int,int> seen;  // value → index
    for (int i = 0; i < (int)nums.size(); i++) {
        int complement = target - nums[i];
        if (seen.count(complement))
            return {seen[complement], i};
        seen[nums[i]] = i;
    }
    return {};
}
```

## Frequency Count Pattern

```cpp
// Top-K Frequent Elements
unordered_map<int,int> freq;
for (int n : nums) freq[n]++;
// then use a min-heap or bucket sort on freq values
```

## Complexity
- Time: O(n) — single pass
- Space: O(n) — storing up to n entries

## Key Insight
Instead of asking "does a pair exist?" with two nested loops (O(n²)), ask "does the complement of the current element exist in what I've already seen?" — O(1) per element with `unordered_map`.

## C++ Notes
- `unordered_map<K,V>` — O(1) average, O(n) worst case (hash collisions)
- `map<K,V>` — O(log n) ordered, use when you need sorted keys
- `unordered_set<K>` — when you only care about membership, not values
