**Pattern: In-place Reversal**

Keep `prev=null`, `curr=head`. At each step: save `next`, point `curr.next` to `prev`, move `prev` to `curr`, move `curr` to saved `next`. Return `prev` at the end.
