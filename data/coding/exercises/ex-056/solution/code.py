def is_happy(n: int) -> bool:
    def next_num(x: int) -> int:
        total = 0
        while x > 0:
            total += (x % 10) ** 2
            x //= 10
        return total

    slow, fast = n, next_num(n)
    while fast != 1 and slow != fast:
        slow = next_num(slow)
        fast = next_num(next_num(fast))
    return fast == 1
