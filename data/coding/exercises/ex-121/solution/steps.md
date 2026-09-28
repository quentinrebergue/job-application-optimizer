# Solution Approach: Length-Prefix Encoding

## Pattern Recognition
→ **Other (Design)** — a delimiter character can always appear inside a string, so a naive join-with-separator is ambiguous. Instead, prefix each string with its own length, which is self-describing and delimiter-free.

## Steps

**Encode:**
1. For each string `s`, emit `f"{len(s)}#{s}"` and concatenate all of them together.

**Decode:**
1. Scan the encoded string with a pointer `i`.
2. From `i`, read forward until a `#` is found — everything before it is the length of the next string.
3. Read exactly that many characters after the `#` as the next decoded string.
4. Advance `i` past that string and repeat until the end.

## Why This Works
The length prefix tells the decoder exactly how many characters to consume next, regardless of what those characters are — including any `#` or digit characters that would otherwise be ambiguous with a plain separator-based scheme. Since a length is always a fixed, unambiguous number of digits followed by one `#`, there's never a parsing conflict.

## Complexity
- Time: O(total length of all strings), for both encode and decode
- Space: O(total length) for the encoded string
