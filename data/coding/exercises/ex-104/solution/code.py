def pacific_atlantic(heights: list[list[int]]) -> list[list[int]]:
    if not heights or not heights[0]:
        return []

    rows, cols = len(heights), len(heights[0])
    pacific = [[False] * cols for _ in range(rows)]
    atlantic = [[False] * cols for _ in range(rows)]

    def dfs(r: int, c: int, visited: list[list[bool]]) -> None:
        visited[r][c] = True
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if (
                0 <= nr < rows and 0 <= nc < cols
                and not visited[nr][nc]
                and heights[nr][nc] >= heights[r][c]
            ):
                dfs(nr, nc, visited)

    for c in range(cols):
        dfs(0, c, pacific)
        dfs(rows - 1, c, atlantic)
    for r in range(rows):
        dfs(r, 0, pacific)
        dfs(r, cols - 1, atlantic)

    return [[r, c] for r in range(rows) for c in range(cols) if pacific[r][c] and atlantic[r][c]]
