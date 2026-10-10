import sys
sys.path.insert(0, "demos/aitoy")
import numpy as np
from aitoy import attention as T

def run(sentence, temp=1.0, scale=True):
    words = sentence.split()
    x = T.embed(words)
    out = []
    for L in T.layer_list():
        Q, K, V = x @ L.Wq, x @ L.Wk, x @ L.Wv
        s = Q @ K.T / (np.sqrt(Q.shape[1]) if scale else 1) / temp
        A = np.exp(s - s.max(1, keepdims=True)); A /= A.sum(1, keepdims=True)
        x = x + A @ V
        out.append(A)
    return words, out, T.referent(x, words)

np.set_printoptions(precision=2, suppress=True, linewidth=200)
for s in ["the cat chased the mouse because it was hungry", "the cat chased the mouse because it was scared",
          "the mouse chased the cat because it was hungry", "the dog followed the fox because it was slow"]:
    w, A, r = run(s)
    print(s, "->", r)
    for i, a in enumerate(A):
        print(" layer", i + 1, "row 'it':", dict(zip(w, a[6].round(2))))
    print(" layer 2 full:\n", A[1])
w, A, r = run("the cat chased the mouse because it was hungry", scale=False)
print("no scaling ->", r, A[1][6])
