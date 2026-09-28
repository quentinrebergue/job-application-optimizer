# Backtracking

## Concept
Systematically explore all candidates by building the solution incrementally. Abandon ("backtrack") a partial candidate as soon as it cannot possibly lead to a valid solution.

## Mental Model
A decision tree: at each node you make a choice, recurse into the subtree, then undo the choice (backtrack) before trying the next option.

## Template

```cpp
void backtrack(vector<int>& path, vector<bool>& used,
               vector<int>& nums, vector<vector<int>>& res) {
    if (isComplete(path)) {
        res.push_back(path);    // snapshot
        return;
    }
    for (int i = 0; i < nums.size(); i++) {
        if (!isValid(i, used, path)) continue;  // prune
        path.push_back(nums[i]); used[i] = true;   // choose
        backtrack(path, used, nums, res);           // explore
        path.pop_back(); used[i] = false;           // un-choose
    }
}
```

## Subsets — start index avoids revisiting

```cpp
void subsets(vector<int>& nums, int start,
             vector<int>& cur, vector<vector<int>>& res) {
    res.push_back(cur);
    for (int i = start; i < (int)nums.size(); i++) {
        cur.push_back(nums[i]);
        subsets(nums, i + 1, cur, res);
        cur.pop_back();
    }
}
```

## Three Classic Problem Types
| Type | What varies | Constraint |
|------|-------------|-----------|
| Permutations | order matters | each element used once |
| Combinations | order doesn't matter | choose k from n |
| Subsets | all subsets | each element included or not |

## Pruning
- Sort input so you can `break` early (duplicate handling, bound checks)
- Track `used[]` boolean array or `start` index to avoid revisiting

## Complexity
Permutations: O(n! × n). Subsets: O(2ⁿ × n).

## Classic Problems
- Permutations, Combinations, Subsets, N-Queens, Sudoku Solver, Word Search, Palindrome Partitioning
