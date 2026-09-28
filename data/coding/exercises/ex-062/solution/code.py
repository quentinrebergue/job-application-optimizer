def daily_temperatures(temperatures: list[int]) -> list[int]:
    res = [0] * len(temperatures)
    stack = []  # indices

    for i, t in enumerate(temperatures):
        while stack and temperatures[stack[-1]] < t:
            j = stack.pop()
            res[j] = i - j
        stack.append(i)
    return res
