def check_inclusion(s1: str, s2: str) -> bool:
    if len(s1) > len(s2):
        return False
    need = [0] * 26
    window = [0] * 26

    for c in s1:
        need[ord(c) - 97] += 1
    for i in range(len(s1)):
        window[ord(s2[i]) - 97] += 1

    if need == window:
        return True

    for right in range(len(s1), len(s2)):
        window[ord(s2[right]) - 97] += 1
        window[ord(s2[right - len(s1)]) - 97] -= 1
        if need == window:
            return True

    return False
