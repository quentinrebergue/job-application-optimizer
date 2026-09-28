# Encode and Decode Strings

Design an algorithm to encode a list of strings to a single string, and decode that string back to the original list of strings.

The encoded string is sent over the network and needs to be decoded back to the original list. Your algorithm must work for any list of strings, including strings that contain any characters (including delimiters you might otherwise choose, like commas or special characters).

**Example 1:**
```
Input: ["Hello","World"]
Output after encode+decode: ["Hello","World"]
```

**Example 2:**
```
Input: [""]
Output after encode+decode: [""]
```

**Constraints:**
- 0 ≤ strs.length ≤ 200
- 0 ≤ strs[i].length ≤ 200
- strs[i] contains any possible characters out of 256 valid ASCII characters
