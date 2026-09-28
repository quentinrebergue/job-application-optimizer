def character_replacement(s: str, k: int) -> int:
    freq = [0] * 26
    left, max_freq, result = 0, 0, 0

    for right in range(len(s)):
        ri = ord(s[right]) - 65
        freq[ri] += 1
        max_freq = max(max_freq, freq[ri])

        if right - left + 1 - max_freq > k:
            freq[ord(s[left]) - 65] -= 1
            left += 1

        result = max(result, right - left + 1)

    return result
