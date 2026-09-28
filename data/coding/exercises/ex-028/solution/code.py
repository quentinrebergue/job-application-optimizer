def bag_of_tokens_score(tokens: list[int], power: int) -> int:
    tokens.sort()
    left, right = 0, len(tokens) - 1
    score, max_score = 0, 0

    while left <= right:
        if power >= tokens[left]:
            power -= tokens[left]
            left += 1
            score += 1
            max_score = max(max_score, score)
        elif score >= 1 and left < right:
            power += tokens[right]
            right -= 1
            score -= 1
        else:
            break

    return max_score
