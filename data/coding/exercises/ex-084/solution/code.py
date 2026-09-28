import bisect


# O(n log n) - patience sort
def length_of_lis(nums: list[int]) -> int:
    tails = []

    for n in nums:
        i = bisect.bisect_left(tails, n)
        if i == len(tails):
            tails.append(n)
        else:
            tails[i] = n
    return len(tails)
