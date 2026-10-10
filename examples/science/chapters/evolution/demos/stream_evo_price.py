"""Live Python animation: the two terms of the Price equation, drawn as arrows on the landscape (see evo_core.Lens)."""
import evo_core

if __name__ == "__main__":
    evo_core.serve_view(lambda: evo_core.Lens("price"), "evo-price", 19402)
