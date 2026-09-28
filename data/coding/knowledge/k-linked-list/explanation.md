# Linked List Patterns

## Node Definition

```cpp
struct ListNode {
    int val;
    ListNode* next;
    ListNode(int v = 0, ListNode* n = nullptr) : val(v), next(n) {}
};
```

## Dummy / Sentinel Node
Prepend a dummy head to avoid special-casing the head. Return `dummy->next`.

```cpp
ListNode dummy(0);
dummy.next = head;
ListNode* curr = &dummy;
// ...
return dummy.next;
```

## Reversal (iterative)

```cpp
ListNode* reverse(ListNode* head) {
    ListNode* prev = nullptr;
    ListNode* curr = head;
    while (curr) {
        ListNode* next = curr->next;
        curr->next = prev;
        prev = curr;
        curr = next;
    }
    return prev;
}
```

## Find Middle (fast/slow pointers)

```cpp
ListNode* findMiddle(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast->next && fast->next->next) {
        slow = slow->next;
        fast = fast->next->next;
    }
    return slow;   // left-middle for even length
}
```

## Nth From End (two pointers, one pass)
Advance `fast` n steps, then move both until `fast->next == nullptr` — `slow` is the node before the target.

```cpp
ListNode* removeNthFromEnd(ListNode* head, int n) {
    ListNode dummy(0, head);
    ListNode* fast = &dummy;
    ListNode* slow = &dummy;
    for (int i = 0; i <= n; i++) fast = fast->next;
    while (fast) { fast = fast->next; slow = slow->next; }
    slow->next = slow->next->next;
    return dummy.next;
}
```

## Detect Cycle (Floyd's algorithm)

```cpp
bool hasCycle(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) return true;
    }
    return false;
}
```

## Complexity
- Traversal: O(n) time, O(1) space
- Reversal: O(n) time, O(1) space
- Find middle: O(n) time, O(1) space

## Classic Problems
- Reverse Linked List, Merge Two Sorted Lists, Remove Nth From End, Detect Cycle, Reorder List, Reverse k-Group
