"""Live Python animation: a population climbing a fitness landscape (the hero demo of the evolution chapter).

The model, the wire format and the server are in evo_core.py. This view is a 1280 x 720 canvas: the landscape on the right,
two live plots (mean fitness, trait variance) and the generation count on the left. The client's n, dt and g are read as the
population size, the mutation step and the selection strength; the extra sliders are rugged, env, comp, h2 and start.
"""
import evo_core

if __name__ == "__main__":
    evo_core.serve_view(evo_core.Hero, "evo-landscape", 19400)
