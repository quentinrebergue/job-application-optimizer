class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


def reverse_k_group(head: ListNode | None, k: int) -> ListNode | None:
    dummy = ListNode(0, head)
    group_prev = dummy

    while True:
        kth = get_kth(group_prev, k)
        if not kth:
            break

        group_start = group_prev.next
        next_group = kth.next

        # Reverse the group
        kth.next = None
        group_prev.next = reverse(group_start)
        group_start.next = next_group
        group_prev = group_start

    return dummy.next


def get_kth(node: ListNode, k: int) -> ListNode | None:
    cur = node
    while cur and k > 0:
        cur = cur.next
        k -= 1
    return cur


def reverse(head: ListNode | None) -> ListNode | None:
    prev = None
    cur = head
    while cur:
        nxt = cur.next
        cur.next = prev
        prev = cur
        cur = nxt
    return prev
