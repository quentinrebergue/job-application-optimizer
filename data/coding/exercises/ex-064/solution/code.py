import heapq


def find_kth_largest(nums: list[int], k: int) -> int:
    return heapq.nlargest(k, nums)[-1]


# QuickSelect approach (O(n) average)
def find_kth_largest_qs(nums: list[int], k: int) -> int:
    target = len(nums) - k

    def partition(l: int, r: int) -> int:
        pivot = nums[r]
        p = l
        for i in range(l, r):
            if nums[i] <= pivot:
                nums[i], nums[p] = nums[p], nums[i]
                p += 1
        nums[p], nums[r] = nums[r], nums[p]
        return p

    l, r = 0, len(nums) - 1
    while l < r:
        p = partition(l, r)
        if p == target:
            break
        elif p < target:
            l = p + 1
        else:
            r = p - 1
    return nums[target]
