def largest_rectangle_area(heights: list[int]) -> int:
    stack = []
    max_area = 0
    bars = heights + [0]  # sentinel

    for i, h in enumerate(bars):
        while stack and bars[stack[-1]] > h:
            height = bars[stack.pop()]
            width = i - stack[-1] - 1 if stack else i
            max_area = max(max_area, height * width)
        stack.append(i)
    return max_area
