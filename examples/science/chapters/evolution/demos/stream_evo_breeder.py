"""Live Python animation: the breeder's equation R = h2 S, drawn as arrows on the landscape (see evo_core.Lens)."""
import evo_core

if __name__ == "__main__":
    evo_core.serve_view(lambda: evo_core.Lens("breeder"), "evo-breeder", 19401)
