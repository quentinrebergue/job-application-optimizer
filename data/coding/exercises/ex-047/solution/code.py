def is_n_straight_hand(hand: list[int], group_size: int) -> bool:
    if len(hand) % group_size != 0:
        return False

    freq = {}
    for card in hand:
        freq[card] = freq.get(card, 0) + 1

    for card in sorted(freq.keys()):
        count = freq[card]
        if count == 0:
            continue
        for j in range(group_size):
            need = freq.get(card + j, 0)
            if need < count:
                return False
            freq[card + j] = need - count

    return True
