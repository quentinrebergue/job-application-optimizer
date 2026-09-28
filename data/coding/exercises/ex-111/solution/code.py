class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


def merge_two_lists(list1: ListNode | None, list2: ListNode | None) -> ListNode | None:
    dummy = ListNode(0)
    curr = dummy

    while list1 and list2:
        if list1.val <= list2.val:
            curr.next, list1 = list1, list1.next
        else:
            curr.next, list2 = list2, list2.next
        curr = curr.next

    curr.next = list1 or list2
    return dummy.next
