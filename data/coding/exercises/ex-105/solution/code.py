def longest_consecutive(nums: list[int]) -> int:
    num_set = set(nums)
    best = 0

    for num in num_set:
        if num - 1 in num_set:
            continue
        length = 1
        while num + length in num_set:
            length += 1
        best = max(best, length)

    return best
