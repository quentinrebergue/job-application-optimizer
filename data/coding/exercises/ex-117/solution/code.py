def is_anagram(s: str, t: str) -> bool:
    if len(s) != len(t):
        return False

    counts = {}
    for c in s:
        counts[c] = counts.get(c, 0) + 1
    for c in t:
        if c not in counts:
            return False
        counts[c] -= 1
        if counts[c] < 0:
            return False

    return True
