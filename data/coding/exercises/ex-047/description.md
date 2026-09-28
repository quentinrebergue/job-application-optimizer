# Hand of Straights

Alice wants to rearrange her cards into groups of size `groupSize`, where each group consists of `groupSize` **consecutive** cards.

Given `hand[i]` as the value of card `i` and integer `groupSize`, return `true` if she can rearrange the cards, otherwise `false`.

**Example 1:**
```
Input:  hand = [1,2,3,6,2,3,4,7,8], groupSize = 3
Output: true
Explanation: Groups: [1,2,3], [2,3,4], [6,7,8]
```

**Example 2:**
```
Input:  hand = [1,2,3,4,5], groupSize = 4
Output: false
```

**Constraints:**
- `1 <= hand.length <= 10⁴`
- `0 <= hand[i] <= 10⁹`
- `1 <= groupSize <= hand.length`
