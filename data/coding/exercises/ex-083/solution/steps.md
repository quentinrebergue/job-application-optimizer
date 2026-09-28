**Pattern: Backtracking with 3 Sets**

Place one queen per row. Track occupied columns, diagonals (`row-col`), and anti-diagonals (`row+col`) in sets. Try each column in the current row; if safe, place and recurse to next row.
