"""Build the unified 34-flower catalogue and the historical Cosmos entry."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).resolve().parent/'collection/build_collection.py'),run_name='__main__')
