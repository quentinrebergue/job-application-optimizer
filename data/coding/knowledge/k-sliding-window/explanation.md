# Sliding Window

## Concept
A sliding window is a subarray (or substring) of fixed or variable size that moves through the data from left to right. Instead of recomputing the entire window each time, you incrementally add the new element and remove the old one.

## When to Use
- Finding a subarray/substring satisfying a condition (max sum, longest without repeats, etc.)
- The problem involves contiguous elements
- A brute force O(n²) solution exists but you need O(n)

## Fixed-Size Window Pattern

```cpp
int maxSumSubarray(vector<int>& arr, int k) {
    int windowSum = 0;
    for (int i = 0; i < k; i++) windowSum += arr[i];
    int maxSum = windowSum;
    for (int i = k; i < (int)arr.size(); i++) {
        windowSum += arr[i] - arr[i - k];
        maxSum = max(maxSum, windowSum);
    }
    return maxSum;
}
```

## Variable-Size Window Pattern

```cpp
int longestSubarrayWithSum(vector<int>& arr, int target) {
    int left = 0, currentSum = 0, maxLen = 0;
    for (int right = 0; right < (int)arr.size(); right++) {
        currentSum += arr[right];
        while (currentSum > target)
            currentSum -= arr[left++];
        maxLen = max(maxLen, right - left + 1);
    }
    return maxLen;
}
```

## Window with Hash Map (character counts)

```cpp
int lengthOfLongestSubstring(string s) {
    unordered_map<char,int> count;
    int left = 0, maxLen = 0;
    for (int right = 0; right < (int)s.size(); right++) {
        count[s[right]]++;
        while (count[s[right]] > 1)
            count[s[left++]]--;
        maxLen = max(maxLen, right - left + 1);
    }
    return maxLen;
}
```

## Complexity
- Time: O(n) — each element is added and removed at most once
- Space: O(1) for simple windows, O(k) if storing window elements

## Classic Problems
- Maximum Average Subarray, Minimum Size Subarray Sum, Longest Substring Without Repeating Characters, Find All Anagrams
