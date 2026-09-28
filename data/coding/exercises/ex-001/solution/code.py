# Two Sum — Hash Map approach
# Time: O(n) | Space: O(n)

def two_sum(nums: list[int], target: int) -> list[int]:
    seen = {}  # value -> index

    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i

    # Guaranteed to have a solution per problem constraints
    raise ValueError('No solution found')
