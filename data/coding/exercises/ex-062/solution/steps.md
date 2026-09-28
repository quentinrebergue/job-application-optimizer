**Pattern: Monotonic Stack (decreasing)**

Maintain a stack of indices with decreasing temperatures. When a warmer day arrives, pop all colder days from the stack and compute the wait = currentIndex - poppedIndex.
