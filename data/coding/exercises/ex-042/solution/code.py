def total_fruit(fruits: list[int]) -> int:
    basket = {}
    left, max_len = 0, 0

    for right in range(len(fruits)):
        basket[fruits[right]] = basket.get(fruits[right], 0) + 1

        while len(basket) > 2:
            lf = fruits[left]
            basket[lf] -= 1
            if basket[lf] == 0:
                del basket[lf]
            left += 1

        max_len = max(max_len, right - left + 1)

    return max_len
