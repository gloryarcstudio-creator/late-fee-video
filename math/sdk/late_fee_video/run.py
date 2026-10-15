"""Generate books, lookup tables and index.json for Late Fee Video.

Usage: python3 run.py [sims_scale] [--no-opt] [--no-analysis]
The game folder must live (or be symlinked) under <math-sdk>/games/.
"""

import sys
from gamestate import GameState
from game_config import GameConfig
from game_optimization import OptimizationSetup
from optimization_program.run_script import OptimizationExecution
from utils.game_analytics.run_analysis import create_stat_sheet
from utils.rgs_verification import execute_all_tests
from src.state.run_sims import create_books
from src.write_data.write_configs import generate_configs

if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    scale = float(args[0]) if args else 1.0
    num_threads = 4
    rust_threads = 4
    batching_size = 5000
    compression = True
    profiling = False

    num_sim_args = {
        "base": int(3e5 * scale),
        "ante2": int(1.5e5 * scale),
        "ante4": int(1.5e5 * scale),
        "bonus": int(6e4 * scale),
        "double": int(6e4 * scale),
        "director": int(6e4 * scale),
        "latefee": int(6e4 * scale),
        "tracking": int(6e4 * scale),
    }
    for k, v in num_sim_args.items():
        # mode-sims must divide by threads * batch
        num_sim_args[k] = max(num_threads * batching_size, (v // (num_threads * batching_size)) * num_threads * batching_size)
        if v < batching_size * batching_size:
            num_sim_args[k] = max(v, num_threads)

    run_conditions = {
        "run_sims": "--no-sims" not in sys.argv,
        "run_optimization": "--no-opt" not in sys.argv,
        "run_analysis": "--no-analysis" not in sys.argv,
        "run_format_checks": True,
    }
    target_modes = list(num_sim_args.keys())

    config = GameConfig()
    gamestate = GameState(config)
    if run_conditions["run_optimization"] or run_conditions["run_analysis"]:
        OptimizationSetup(config)

    if run_conditions["run_sims"]:
        create_books(gamestate, config, num_sim_args, batching_size, num_threads, compression, profiling)

    generate_configs(gamestate)

    if run_conditions["run_optimization"]:
        OptimizationExecution().run_all_modes(config, target_modes, rust_threads)
        generate_configs(gamestate)

    if run_conditions["run_analysis"]:
        create_stat_sheet(gamestate, custom_keys=[{"symbol": "scatter"}, {"kind": "rewind"}, {"kind": "pause"}])

    if run_conditions["run_format_checks"]:
        execute_all_tests(config)
