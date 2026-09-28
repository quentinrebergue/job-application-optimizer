class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


def remove_nth_from_end(head: ListNode | None, n: int) -> ListNode | None:
    dummy = ListNode(0, head)
    fast = dummy
    slow = dummy

    for _ in range(n + 1):
        fast = fast.next

    while fast is not None:
        fast = fast.next
        slow = slow.next

    slow.next = slow.next.next
    return dummy.next
