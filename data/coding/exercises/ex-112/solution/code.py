def reorder_list(head: ListNode | None) -> None:
    if not head or not head.next:
        return

    # Find middle
    slow, fast = head, head
    while fast.next and fast.next.next:
        slow = slow.next
        fast = fast.next.next

    # Reverse second half
    prev, curr = None, slow.next
    slow.next = None
    while curr:
        curr.next, prev, curr = prev, curr, curr.next

    # Merge alternately
    first, second = head, prev
    while second:
        first.next, first = second, first.next
        second.next, second = first, second.next
