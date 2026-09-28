def flood_fill(image: list[list[int]], sr: int, sc: int, color: int) -> list[list[int]]:
    orig = image[sr][sc]
    if orig == color:
        return image

    def dfs(r: int, c: int) -> None:
        if r < 0 or r >= len(image) or c < 0 or c >= len(image[0]):
            return
        if image[r][c] != orig:
            return
        image[r][c] = color
        dfs(r + 1, c)
        dfs(r - 1, c)
        dfs(r, c + 1)
        dfs(r, c - 1)

    dfs(sr, sc)
    return image
