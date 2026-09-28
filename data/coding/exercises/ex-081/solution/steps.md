**Pattern: Reverse Thinking DFS**

Mark all 'O's reachable from the border as safe (temp mark 'S'). Then flip: all remaining 'O' → 'X', all 'S' → 'O'. This avoids tracking connectivity directly.
