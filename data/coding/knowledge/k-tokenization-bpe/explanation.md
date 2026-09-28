# Tokenization & BPE

## What Is Tokenization?
Converts raw text into a sequence of integer token IDs that a model can process. The vocabulary (token→id mapping) is fixed at training time.

## Why Not Character or Word Tokenization?
- **Character-level**: very long sequences, hard to learn word meaning
- **Word-level**: huge vocabulary, fails on unseen words, bad for morphology
- **Subword** (BPE, WordPiece, SentencePiece): balances vocabulary size with sequence length, handles rare/unknown words gracefully

## Byte-Pair Encoding (BPE)

### Training Algorithm
1. Start with a vocabulary of all individual characters (bytes).
2. Count all adjacent pair frequencies in the corpus.
3. Merge the most frequent pair into a new token.
4. Repeat until vocabulary size V is reached.

```
corpus: "low lower lowest"
initial: l o w _ l o w e r _ l o w e s t
step 1: merge 'l','o' → 'lo'  (most frequent pair)
step 2: merge 'lo','w' → 'low'
...
```

### Inference (Encoding)
Apply learned merges in order (greedy, longest-match) to tokenize new text.

## Tiktoken / SentencePiece
- **Tiktoken** (OpenAI): byte-level BPE, very fast C++ implementation
- **SentencePiece** (Google): language-agnostic, works directly on raw Unicode, used by LLaMA/Mistral

## Important Properties
- **Fertility**: average tokens per word. English ~1.3, code ~1.5, other languages can be 3–5× (poor multilingual coverage)
- **Special tokens**: `<s>`, `</s>`, `[PAD]`, `[MASK]` — added to vocabulary, never split
- **Vocabulary size**: typically 32k–128k tokens. Mistral uses 32k.

## Why It Matters for LLMs
- Token count directly drives compute cost (attention is O(n²))
- Poor tokenization of numbers/code is a known LLM weakness
- A prompt with many rare/foreign words uses more tokens → higher latency and cost