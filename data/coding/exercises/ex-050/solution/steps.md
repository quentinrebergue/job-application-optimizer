**Pattern: Prefix Sum + Hash Map**

Replace 0s with -1s. Now "equal 0s and 1s" = "subarray sum = 0". Track running sum; if same sum seen before, the subarray between is balanced. Store first occurrence of each sum in a map.
