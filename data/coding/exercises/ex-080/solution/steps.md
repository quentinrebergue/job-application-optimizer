**Pattern: DFS/BFS on Grid**

DFS from (sr,sc). If current pixel matches original color (and isn't already new color), paint it and recurse to 4-directional neighbors. Guard against same old=new color to avoid infinite loop.
