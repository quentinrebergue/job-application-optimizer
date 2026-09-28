# Solution Approach: Transpose + Reverse Rows

## Pattern Recognition
→ **Matrix in-place manipulation** — 90° clockwise rotation = transpose followed by row reversal.

## Steps

1. **Transpose**: swap `matrix[i][j]` with `matrix[j][i]` for all `i < j`.
   - Row i becomes column i; the matrix is mirrored along the main diagonal.

2. **Reverse each row**: `matrix[i].reverse()`.

## Proof
Original position `(i, j)` → after transpose → `(j, i)` → after row reversal → `(j, n-1-i)`.

A 90° clockwise rotation maps `(i, j) → (j, n-1-i)`. ✓

## Alternative: Layer-by-Layer Rotation
Rotate the outer layer, then inner layers. Involves 4-way swaps: `(i,j) → (j, n-1-i) → (n-1-i, n-1-j) → (n-1-j, i)`. More complex to implement, same complexity.

## Complexity
- Time: O(n²)
- Space: O(1) — in-place
