# Binary Search

## Concept
Repeatedly halve the search space by comparing the target to the middle element. Requires the array to be sorted (or monotonic).

## When to Use
- Searching in a sorted array
- Finding the boundary of a condition (first/last true in a boolean predicate)
- Searching in a rotated sorted array
- Minimizing/maximizing a value subject to a monotonic constraint

## Standard Template

```cpp
int binarySearch(vector<int>& arr, int target) {
    int left = 0, right = arr.size() - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;   // avoids overflow
        if (arr[mid] == target) return mid;
        else if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}
```

## Find-Boundary Template (first index where condition is true)

```cpp
int firstTrue(vector<int>& arr, function<bool(int)> cond) {
    int left = 0, right = arr.size() - 1, result = -1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (cond(arr[mid])) { result = mid; right = mid - 1; }  // search left
        else left = mid + 1;
    }
    return result;
}
```

## Rotated Array Variant

```cpp
int searchRotated(vector<int>& nums, int target) {
    int left = 0, right = nums.size() - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] == target) return mid;
        if (nums[left] <= nums[mid]) {   // left half sorted
            if (nums[left] <= target && target < nums[mid]) right = mid - 1;
            else left = mid + 1;
        } else {                         // right half sorted
            if (nums[mid] < target && target <= nums[right]) left = mid + 1;
            else right = mid - 1;
        }
    }
    return -1;
}
```

## Complexity
- Time: O(log n)
- Space: O(1)

## Classic Problems
- Binary Search, Search in Rotated Sorted Array, Find First and Last Position, Koko Eating Bananas
