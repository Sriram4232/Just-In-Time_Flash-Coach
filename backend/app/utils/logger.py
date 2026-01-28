
import logging
import os

def setup_logging():
    logging.basicConfig(
        filename='backend_errors.log', 
        level=logging.ERROR, 
        format='%(asctime)s %(levelname)s:%(message)s'
    )
    # Also ensure info/debugging if needed, or stick to user config
    # The user's original code had level=logging.ERROR
