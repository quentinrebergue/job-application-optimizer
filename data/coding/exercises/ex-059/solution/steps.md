**Pattern: In-place Reversal with Dummy Node**

Use a dummy head. Walk to node before `left`. Then do in-place reversal for `right-left` steps, inserting each node right after the pre-left node (front insertion). One pass.
