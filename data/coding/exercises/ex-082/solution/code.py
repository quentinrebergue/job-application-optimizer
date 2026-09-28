def subsets(nums: list[int]) -> list[list[int]]:
    res = []

    def backtrack(start: int, current: list[int]) -> None:
        res.append(current[:])
        for i in range(start, len(nums)):
            current.append(nums[i])
            backtrack(i + 1, current)
            current.pop()

    backtrack(0, [])
    return res
