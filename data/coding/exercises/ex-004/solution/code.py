def is_valid(s: str) -> bool:
    match = {')': '(', '}': '{', ']': '['}
    stack = []

    for c in s:
        if c in '({[':
            stack.append(c)
        else:
            if not stack or stack[-1] != match[c]:
                return False
            stack.pop()

    return len(stack) == 0
