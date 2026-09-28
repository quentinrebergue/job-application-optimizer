# Fast Exponentiation

## Problem
Compute `x^n` in O(log n) instead of O(n).

## Key Insight
```text
x^n = x * x^(n-1)    if n is odd
x^n = (x²)^(n/2)     if n is even  (halves the problem)
x^0 = 1              base case
```

## Recursive Version

```cpp
double myPow(double x, long long n) {
    if (n == 0) return 1;
    if (n < 0) return myPow(1.0 / x, -n);
    if (n % 2 == 1) return x * myPow(x, n - 1);
    return myPow(x * x, n / 2);
}
```

## Iterative Version (no stack, preferred)

```cpp
double myPow(double x, long long n) {
    if (n < 0) { x = 1.0 / x; n = -n; }
    double result = 1.0;
    while (n > 0) {
        if (n & 1) result *= x;   // n is odd: multiply current base
        x *= x;                   // square the base
        n >>= 1;                  // halve the exponent
    }
    return result;
}
```

## Why It Works
We decompose n in binary. Each 1-bit in the binary representation of n contributes a corresponding power of x. Example: x^13 = x^8 × x^4 × x^1 (13 = 1101₂).

## Modular Exponentiation Variant

```cpp
long long modPow(long long base, long long exp, long long mod) {
    long long result = 1;
    base %= mod;
    while (exp > 0) {
        if (exp & 1) result = result * base % mod;
        base = base * base % mod;
        exp >>= 1;
    }
    return result;
}
```

## Complexity
- Time: O(log n)
- Space: O(log n) recursive, O(1) iterative

## Classic Problems
- Pow(x, n), Fast Matrix Exponentiation (Fibonacci in O(log n)), Modular Inverse
