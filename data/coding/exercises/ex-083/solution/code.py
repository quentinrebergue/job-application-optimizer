def solve_n_queens(n: int) -> list[list[str]]:
    res = []
    cols, diag, anti = set(), set(), set()
    board = []  # board[row] = col

    def backtrack(row: int) -> None:
        if row == n:
            res.append(['.' * c + 'Q' + '.' * (n - c - 1) for c in board])
            return
        for c in range(n):
            if c in cols or (row - c) in diag or (row + c) in anti:
                continue
            cols.add(c)
            diag.add(row - c)
            anti.add(row + c)
            board.append(c)
            backtrack(row + 1)
            board.pop()
            cols.remove(c)
            diag.remove(row - c)
            anti.remove(row + c)

    backtrack(0)
    return res
