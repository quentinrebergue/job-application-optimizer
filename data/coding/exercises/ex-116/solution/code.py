def unique_paths(m: int, n: int) -> int:
    row = [1] * n

    for _ in range(m - 1):
        for c in range(1, n):
            row[c] += row[c - 1]

    return row[n - 1]
