def least_interval(tasks: list[str], n: int) -> int:
    freq = [0] * 26
    for t in tasks:
        freq[ord(t) - 65] += 1

    max_freq = max(freq)
    count_max = freq.count(max_freq)

    return max(len(tasks), (max_freq - 1) * (n + 1) + count_max)
