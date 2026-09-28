def alien_order(words: list[str]) -> str:
    adj = {c: set() for word in words for c in word}

    for w1, w2 in zip(words, words[1:]):
        min_len = min(len(w1), len(w2))
        if w1[:min_len] == w2[:min_len] and len(w1) > len(w2):
            return ""
        for c1, c2 in zip(w1, w2):
            if c1 != c2:
                adj[c1].add(c2)
                break

    state = {}  # char -> 0=unvisited (absent), 1=visiting, 2=done
    order = []

    def dfs(c: str) -> bool:
        if c in state:
            return state[c] != 1
        state[c] = 1
        for nxt in adj[c]:
            if not dfs(nxt):
                return False
        state[c] = 2
        order.append(c)
        return True

    for c in list(adj.keys()):
        if not dfs(c):
            return ""

    return ''.join(reversed(order))
