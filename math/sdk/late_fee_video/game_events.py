"""Custom book events for Late Fee Video (PAUSE, tape, REWIND, second take)."""

from copy import deepcopy
from src.events.events import json_ready_sym


def _board_json(gamestate, board=None, top=None, bottom=None):
    """Board in the same shape as the reveal event (with padding rows)."""
    board = board if board is not None else gamestate.board
    top = top if top is not None else gamestate.top_symbols
    bottom = bottom if bottom is not None else gamestate.bottom_symbols
    attrs = list(gamestate.config.special_symbols.keys())
    out = []
    for reel, column in enumerate(board):
        col = [json_ready_sym(s, attrs) for s in column]
        if gamestate.config.include_padding:
            col = [json_ready_sym(top[reel], attrs)] + col + [json_ready_sym(bottom[reel], attrs)]
        out.append(col)
    return out


def _wins_json(gamestate, wins):
    """Line wins with padded row index and integer amounts."""
    out = deepcopy(wins)
    for w in out:
        w["positions"] = [{"reel": p["reel"], "row": p["row"] + 1} for p in w["positions"]]
        w["win"] = int(round(min(w["win"], gamestate.config.wincap) * 100))
        if "meta" in w:
            w["meta"]["winWithoutMult"] = int(round(min(w["meta"]["winWithoutMult"], gamestate.config.wincap) * 100))
    return out


def _amt(gamestate, x):
    return int(round(min(x, gamestate.config.wincap) * 100))


def _add(gamestate, event):
    event = {"index": len(gamestate.book.events), **event}
    gamestate.book.add_event(event)


def scatter_win_event(gamestate, count, win, positions):
    _add(gamestate, {
        "type": "scatterWin",
        "count": count,
        "positions": [{"reel": p["reel"], "row": p["row"] + 1} for p in positions],
        "win": _amt(gamestate, win),
    })


def pause_start_event(gamestate, frozen_reels):
    _add(gamestate, {"type": "pauseStart", "frozenReels": sorted(frozen_reels)})


def pause_respin_event(gamestate, frozen_reels, wins, increment):
    _add(gamestate, {
        "type": "pauseRespin",
        "frozenReels": sorted(frozen_reels),
        "board": _board_json(gamestate),
        "paddingPositions": gamestate.reel_positions,
        "wins": _wins_json(gamestate, wins),
        "win": _amt(gamestate, increment),
    })


def tape_record_event(gamestate, index, win):
    _add(gamestate, {"type": "tapeRecord", "recordIndex": index, "win": _amt(gamestate, win)})


def rewind_event(gamestate, record_index, record, mult, win):
    _add(gamestate, {
        "type": "rewind",
        "recordIndex": record_index,
        "board": _board_json(gamestate, record["board"], record["top"], record["bottom"]),
        "wins": _wins_json(gamestate, record["wins"]),
        "mult": mult,
        "win": _amt(gamestate, win),
    })


def second_take_event(gamestate, frozen_reels, wins, mult, win):
    _add(gamestate, {
        "type": "secondTake",
        "frozenReels": sorted(frozen_reels),
        "board": _board_json(gamestate),
        "paddingPositions": gamestate.reel_positions,
        "wins": _wins_json(gamestate, wins),
        "mult": mult,
        "win": _amt(gamestate, win),
    })


def rewind_mult_event(gamestate, mult):
    _add(gamestate, {"type": "rewindMult", "mult": mult})
