"""Format des logs : chaque ligne commence par `[processing]`, comme `[web]` côté web.

Usage dans un module : `logger = logging.getLogger(__name__)`. Jamais de clé, de jeton
ni de donnée personnelle dans un message.
"""

import logging
import sys
from functools import cache

LOG_FORMAT = "[processing] %(asctime)s %(levelname)s %(name)s: %(message)s"


@cache
def configure_logging() -> None:
    """Branche le format sur le logger racine, une seule fois par processus."""
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(logging.Formatter(LOG_FORMAT))
    root = logging.getLogger()
    root.addHandler(handler)
    root.setLevel(logging.INFO)
