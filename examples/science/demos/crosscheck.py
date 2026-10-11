"""Cross-check of the numbers the Crowd and Polls components show, with NumPy.

The components compute in the browser (Bayes' theorem, a binomial table, the standard error). This script recomputes the
numbers quoted on the slides in another way, by Monte Carlo, so a reader can see that the live pictures and the maths agree.

    uv run --with numpy==2.5.3 python demos/crosscheck.py
"""
import numpy as np

rng = np.random.default_rng(1)

# Slide 2: 1 in 1,000 is sick, the test catches 99 percent and clears 99 percent.
prev, sens, spec = 0.001, 0.99, 0.99
exact = sens * prev / (sens * prev + (1 - spec) * (1 - prev))
n = 20_000_000
sick = rng.random(n) < prev
positive = np.where(sick, rng.random(n) < sens, rng.random(n) < 1 - spec)
print(f"P(sick | positive): Bayes {exact:.4f}, simulated {sick[positive].mean():.4f}")

# Slides 4 and 5: 52 percent for A, 1,000 people per poll.
p, people, polls = 0.52, 1000, 200_000
share = rng.binomial(people, p, polls) / people
se = np.sqrt(p * (1 - p) / people)
print(f"standard error: formula {se * 100:.3f} points, simulated {share.std() * 100:.3f}")
print(f"95% margin: {1.96 * se * 100:.2f} points; polls inside it: {np.mean(abs(share - p) <= 1.96 * se):.3f}")
print(f"polls that name the wrong winner: {np.mean(share <= 0.5):.3f}")

# A biased sample: 10 percent of A supporters do not answer.
q = p * 0.9 / (p * 0.9 + (1 - p))
for people in (100, 1000, 10_000):
    s = rng.binomial(people, q, polls) / people
    half = 1.96 * np.sqrt(s * (1 - s) / people)
    print(f"bias, n={people:>6}: polls centre on {s.mean():.3f} (truth {p}), intervals that contain the truth {np.mean(abs(s - p) <= half):.3f}")
