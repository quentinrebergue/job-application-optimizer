class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


def delete_duplicates(head: ListNode | None) -> ListNode | None:
    dummy = ListNode(0, head)
    prev = dummy

    while head is not None:
        if head.next is not None and head.val == head.next.val:
            while head.next is not None and head.val == head.next.val:
                head = head.next
            prev.next = head.next
        else:
            prev = prev.next
        head = head.next

    return dummy.next
