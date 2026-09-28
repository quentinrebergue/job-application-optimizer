# Word Search II

Given an `m × n` board of characters and a list of strings `words`, return all words on the board that can be formed by a sequence of adjacent cells (horizontally or vertically neighboring). The same cell may not be used more than once in a word.

**Example 1:**
```
Input:
board = [["o","a","a","n"],["e","t","a","e"],["i","h","k","r"],["i","f","l","v"]]
words = ["oath","pea","eat","rain"]
Output: ["eat","oath"]
```

**Example 2:**
```
Input:
board = [["a","b"],["c","d"]]
words = ["abcb"]
Output: []
```

**Constraints:**
- m == board.length, n == board[i].length
- 1 ≤ m, n ≤ 12
- 1 ≤ words.length ≤ 3 × 10⁴
- 1 ≤ words[i].length ≤ 10
- board[i][j] and words[i] consist of lowercase English letters
- All words[i] are unique
