class TrieNode:
    def __init__(self):
        self.children: dict[str, 'TrieNode'] = {}
        self.word: str | None = None


def find_words(board: list[list[str]], words: list[str]) -> list[str]:
    root = TrieNode()
    for word in words:
        node = root
        for c in word:
            node = node.children.setdefault(c, TrieNode())
        node.word = word

    rows, cols = len(board), len(board[0])
    result = []

    def dfs(r: int, c: int, node: TrieNode) -> None:
        char = board[r][c]
        if char not in node.children:
            return
        next_node = node.children[char]
        if next_node.word:
            result.append(next_node.word)
            next_node.word = None

        board[r][c] = '#'
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and board[nr][nc] != '#':
                dfs(nr, nc, next_node)
        board[r][c] = char

        if not next_node.children:
            del node.children[char]

    for r in range(rows):
        for c in range(cols):
            dfs(r, c, root)

    return result
