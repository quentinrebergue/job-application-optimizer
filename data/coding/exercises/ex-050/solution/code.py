def find_max_length(nums: list[int]) -> int:
    seen = {0: -1}
    total, max_len = 0, 0

    for i, num in enumerate(nums):
        total += 1 if num == 1 else -1
        if total in seen:
            max_len = max(max_len, i - seen[total])
        else:
            seen[total] = i
    return max_len
