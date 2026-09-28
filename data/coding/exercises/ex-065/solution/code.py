def top_k_frequent(nums: list[int], k: int) -> list[int]:
    freq = {}
    for n in nums:
        freq[n] = freq.get(n, 0) + 1

    buckets = [[] for _ in range(len(nums) + 1)]
    for n, f in freq.items():
        buckets[f].append(n)

    res = []
    for i in range(len(buckets) - 1, -1, -1):
        if len(res) >= k:
            break
        res.extend(buckets[i])
    return res[:k]
