from collections import Counter


def min_window(s: str, t: str) -> str:
    need = Counter(t)
    window = {}
    formed = 0
    required = len(need)

    left, min_len, min_start = 0, float('inf'), 0

    for right, c in enumerate(s):
        window[c] = window.get(c, 0) + 1
        if c in need and window[c] == need[c]:
            formed += 1

        while formed == required:
            if right - left + 1 < min_len:
                min_len = right - left + 1
                min_start = left
            lc = s[left]
            window[lc] -= 1
            if lc in need and window[lc] < need[lc]:
                formed -= 1
            left += 1

    return '' if min_len == float('inf') else s[min_start:min_start + min_len]
