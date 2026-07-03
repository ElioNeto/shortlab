"""
Centralized logging setup for ShortLab.
Replaces print() statements with proper structured logging.
"""

import logging
import sys


def setup_logger(name="shortlab"):
    """Set up a logger with stdout handler and consistent formatting."""
    logger = logging.getLogger(name)
    if not logger.handlers:  # Avoid duplicate handlers on re-import
        logger.setLevel(logging.INFO)
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter(
            '%(asctime)s [%(levelname)s] %(message)s',
            datefmt='%H:%M:%S'
        ))
        logger.addHandler(handler)
    return logger


logger = setup_logger()
