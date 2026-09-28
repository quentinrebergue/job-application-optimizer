def kth_smallest(matrix: list[list[int]], k: int) -> int:
    n = len(matrix)
    left, right = matrix[0][0], matrix[n - 1][n - 1]

    def count_le(mid: int) -> int:
        count, row, col = 0, 0, n - 1
        while row < n:
            while col >= 0 and matrix[row][col] > mid:
                col -= 1
            count += col + 1
            row += 1
        return count

    while left < right:
        mid = left + (right - left) // 2
        if count_le(mid) < k:
            left = mid + 1
        else:
            right = mid

    return left
