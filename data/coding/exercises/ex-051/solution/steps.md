**Pattern: Prefix Sum + Hash Map**

Track running prefix sum. For each index, count how many previous prefix sums equal `currentSum - k`. Those represent subarrays ending here with sum = k. Store counts in a map.
