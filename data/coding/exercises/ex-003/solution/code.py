def length_of_longest_substring(s: str) -> int:
    last_seen = {}
    max_len = 0
    left = 0

    for right, c in enumerate(s):
        prev = last_seen.get(c)
        if prev is not None and prev >= left:
            left = prev + 1
        last_seen[c] = right
        max_len = max(max_len, right - left + 1)

    return max_len
