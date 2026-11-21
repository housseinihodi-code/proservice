"""Limitation simple des tentatives de connexion (en mémoire, par processus).

Après MAX_FAILURES échecs pour un même email ou une même IP sur WINDOW secondes,
les tentatives suivantes sont refusées (429) jusqu'à la fin de la fenêtre.
"""
import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException

MAX_FAILURES = 5
WINDOW = 15 * 60

_failures = defaultdict(deque)
_lock = Lock()


def _prune(q: deque, now: float):
    while q and now - q[0] > WINDOW:
        q.popleft()


def check_login_allowed(*keys: str):
    now = time.time()
    with _lock:
        for k in keys:
            q = _failures[k]
            _prune(q, now)
            if len(q) >= MAX_FAILURES:
                wait = int(WINDOW - (now - q[0])) // 60 + 1
                raise HTTPException(
                    status_code=429,
                    detail=f"Trop de tentatives de connexion. Réessayez dans {wait} minute(s).",
                )


def record_login_failure(*keys: str):
    now = time.time()
    with _lock:
        for k in keys:
            _failures[k].append(now)


def reset_login_failures(*keys: str):
    with _lock:
        for k in keys:
            _failures.pop(k, None)
