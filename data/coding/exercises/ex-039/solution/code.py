def find_anagrams(s: str, p: str) -> list[int]:
    if len(p) > len(s):
        return []
    result = []
    p_freq = [0] * 26
    w_freq = [0] * 26

    for c in p:
        p_freq[ord(c) - 97] += 1
    for i in range(len(p)):
        w_freq[ord(s[i]) - 97] += 1

    if p_freq == w_freq:
        result.append(0)

    for right in range(len(p), len(s)):
        w_freq[ord(s[right]) - 97] += 1
        w_freq[ord(s[right - len(p)]) - 97] -= 1
        if p_freq == w_freq:
            result.append(right - len(p) + 1)

    return result
