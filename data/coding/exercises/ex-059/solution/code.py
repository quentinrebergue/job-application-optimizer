def reverse_between(head: ListNode | None, left: int, right: int) -> ListNode | None:
    dummy = ListNode(0)
    dummy.next = head
    pre = dummy

    for _ in range(left - 1):
        pre = pre.next

    curr = pre.next
    for _ in range(right - left):
        nxt = curr.next
        curr.next = nxt.next
        nxt.next = pre.next
        pre.next = nxt
    return dummy.next
