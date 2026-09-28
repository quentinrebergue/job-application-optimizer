**Pattern: Min-Heap**

Seed the heap with (nums1[i], nums2[0]) for all i in nums1 (or just first k). When popping (u, nums2[j]), push (u, nums2[j+1]) if it exists. Extract k pairs total.
