def reverse_bits(n: int) -> int:
    result = 0
    for _ in range(32):
        result <<= 1
        result |= (n & 1)
        n >>= 1
    return result
