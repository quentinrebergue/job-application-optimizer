def find_duplicate(nums: list[int]) -> int:
    slow = fast = nums[0]

    # Phase 1: find intersection
    while True:
        slow = nums[slow]
        fast = nums[nums[fast]]
        if slow == fast:
            break

    # Phase 2: find cycle entry
    slow = nums[0]
    while slow != fast:
        slow = nums[slow]
        fast = nums[fast]
    return slow
