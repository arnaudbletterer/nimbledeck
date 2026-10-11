"""The toy language model of the attention demo: two rounds of attention over 16-number word vectors, in plain NumPy.

It was trained by demos/train_attention.py on made-up sentences of one shape,

    the <animal> <verb> the <animal> because it was <adjective>

with one job: say which animal "it" is. About 2,200 numbers, one sentence pattern, 23 words. It is a toy: it knows nothing
about the world, only that "hungry" goes with the one who chases and "scared" with the one who is chased.
"""
import os
from types import SimpleNamespace

import numpy as np

ANIMALS = ["cat", "mouse", "dog", "fox", "rabbit", "hawk", "wolf", "sheep"]
VERBS = ["chased", "followed", "caught"]
DOER = ["hungry", "angry", "fast", "strong"]      # a feeling or trait of the one who chases
TARGET = ["scared", "slow", "weak", "small"]      # of the one who is chased
VOCAB = ["the", *ANIMALS, *VERBS, "because", "it", "was", *DOER, *TARGET]
INDEX = {w: i for i, w in enumerate(VOCAB)}
D = 16
_P = {}


def _load():
    if not _P:
        z = np.load(os.path.join(os.path.dirname(__file__), "attention.npz"))
        _P.update({k: z[k] for k in z.files})
    return _P


def embed(words):
    """One vector per word: what the word is (a row of the table) plus where it stands in the sentence."""
    p = _load()
    for w in words:
        if w not in INDEX:
            raise KeyError(f"unknown word '{w}'. The toy knows: {' '.join(VOCAB)}")
    if len(words) > len(p["pos"]):
        raise ValueError(f"at most {len(p['pos'])} words")
    return p["emb"][[INDEX[w] for w in words]] + p["pos"][: len(words)]


def layer_list():
    p = _load()
    return [SimpleNamespace(Wq=p[f"Wq{i}"], Wk=p[f"Wk{i}"], Wv=p[f"Wv{i}"]) for i in range(2)]


def referent(x, words):
    """Read the answer off the vector of "it": which animal is it? Returns (animal, probability)."""
    p = _load()
    z = x[words.index("it")] @ p["out"]
    e = np.exp(z - z.max())
    e /= e.sum()
    return ANIMALS[int(e.argmax())], float(e.max())
