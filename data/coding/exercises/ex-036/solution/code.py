def longest_substring(s: str, k: int) -> int:
    max_len = 0

    for t in range(1, 27):
        freq = [0] * 26
        left, unique, count_at_least_k = 0, 0, 0

        for right in range(len(s)):
            ri = ord(s[right]) - 97
            if freq[ri] == 0:
                unique += 1
            freq[ri] += 1
            if freq[ri] == k:
                count_at_least_k += 1

            while unique > t:
                li = ord(s[left]) - 97
                if freq[li] == k:
                    count_at_least_k -= 1
                freq[li] -= 1
                if freq[li] == 0:
                    unique -= 1
                left += 1

            if unique == t and count_at_least_k == t:
                max_len = max(max_len, right - left + 1)

    return max_len
