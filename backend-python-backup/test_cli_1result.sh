#!/bin/bash
source venv/bin/activate
python3 cli_search.py \
  --include "AI" \
  --start-year 2023 \
  --end-year 2023 \
  --max-results 1 \
  --output test_1result.csv
deactivate
