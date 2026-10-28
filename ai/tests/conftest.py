"""
conftest.py — Pytest configuration for AI module tests.
"""
import sys
import os
from pathlib import Path

# Add repo root and ai/ to sys.path
_ai_dir = Path(__file__).parent.parent
_repo_root = _ai_dir.parent

if str(_ai_dir) not in sys.path:
    sys.path.insert(0, str(_ai_dir))
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

os.environ.setdefault("DATA_DIR", str(_repo_root / "backend" / "data"))
os.environ.setdefault("POLICIES_DIR", str(_ai_dir / "data" / "policies"))
