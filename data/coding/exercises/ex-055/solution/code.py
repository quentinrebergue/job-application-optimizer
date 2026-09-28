class ListNode:
    def __init__(self, val):
        self.val = val
        self.next = None


def has_cycle(head: ListNode | None) -> bool:
    slow, fast = head, head

    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            return True
    return False
