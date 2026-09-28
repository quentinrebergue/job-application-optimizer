def permute(nums: list[int]) -> list[list[int]]:
    result = []
    used = set()

    def backtrack(path: list[int]) -> None:
        if len(path) == len(nums):
            result.append(path[:])
            return
        for num in nums:
            if num in used:
                continue
            used.add(num)
            path.append(num)
            backtrack(path)
            path.pop()
            used.remove(num)

    backtrack([])
    return result
