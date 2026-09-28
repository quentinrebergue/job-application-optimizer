def next_greater_element(nums1: list[int], nums2: list[int]) -> list[int]:
    next_greater = {}
    stack = []

    for n in nums2:
        while stack and stack[-1] < n:
            next_greater[stack.pop()] = n
        stack.append(n)
    return [next_greater.get(n, -1) for n in nums1]
