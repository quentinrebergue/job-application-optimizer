# Bag of Tokens

You start with `power` power and score 0. Array `tokens[i]` denotes the value of token i.

Each move, play an **unplayed** token one of two ways:
- **Face-up**: if `power >= tokens[i]`, lose `tokens[i]` power, gain 1 score.
- **Face-down**: if `score >= 1`, gain `tokens[i]` power, lose 1 score.

Return the **maximum possible score** after any number of moves.

**Example 1:**
```
Input:  tokens = [100], power = 50
Output: 0
```

**Example 2:**
```
Input:  tokens = [200,100], power = 150
Output: 1
```

**Example 3:**
```
Input:  tokens = [100,200,300,400], power = 200
Output: 2
Explanation: Play 100 face-up (score=1), play 400 face-down (power+=400), play 200 face-up, play 300 face-up → score=2.
```

**Constraints:**
- `0 <= tokens.length <= 1000`
- `0 <= tokens[i], power < 10⁴`
