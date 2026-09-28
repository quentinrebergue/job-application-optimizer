# Alien Dictionary

There is a new alien language that uses the English alphabet, but the order among the letters is unknown. You are given a list of `words` from the alien dictionary's lexicon, sorted lexicographically by the rules of this new language.

Derive one valid ordering of letters in this language, and return it as a string. If there's no valid ordering, return `""`.

**Example 1:**
```
Input: words = ["wrt","wrf","er","ett","rftt"]
Output: "wertf"
```

**Example 2:**
```
Input: words = ["z","x"]
Output: "zx"
```

**Example 3:**
```
Input: words = ["z","x","z"]
Output: ""
Explanation: "z" would need to come both before and after "x" — contradiction.
```

**Constraints:**
- 1 ≤ words.length ≤ 100
- 1 ≤ words[i].length ≤ 100
- words[i] consists of only lowercase English letters
