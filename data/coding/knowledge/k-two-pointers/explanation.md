# Two Pointers

## Concept
Use two indices that move through the array simultaneously — typically from both ends toward the middle, or both from the left at different speeds (fast/slow). Avoids nested loops.

## When to Use
- Finding a pair/triplet that satisfies a condition in a sorted array
- Removing duplicates or partitioning in-place
- Detecting cycles in a linked list (Floyd's algorithm)
- Comparing two sequences (merge step, palindrome check)

## Pattern: Opposite Ends (sorted array)

```cpp
vector<int> twoSumSorted(vector<int>& arr, int target) {
    int left = 0, right = arr.size() - 1;
    while (left < right) {
        int s = arr[left] + arr[right];
        if (s == target) return {left, right};
        else if (s < target) left++;
        else right--;
    }
    return {-1, -1};
}
```

## Pattern: Fast / Slow (same direction)

```cpp
int removeDuplicates(vector<int>& arr) {
    int slow = 0;
    for (int fast = 1; fast < (int)arr.size(); fast++) {
        if (arr[fast] != arr[slow]) {
            slow++;
            arr[slow] = arr[fast];
        }
    }
    return slow + 1;
}
```

## Complexity
- Time: O(n) — each pointer moves at most n steps
- Space: O(1)

## Classic Problems
- Two Sum II (sorted), 3Sum, Container With Most Water, Remove Duplicates, Linked List Cycle
