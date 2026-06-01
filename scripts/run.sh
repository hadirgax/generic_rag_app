#!/bin/bash

set -euo pipefail

set -a && source .env && set +a

export VENV_PYTHON=/home/hadirgax/conda/envs/generic_rag_app/bin/python

# start application

uv run --no-project --python $VENV_PYTHON main.py
