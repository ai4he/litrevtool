# LitRevTool CLI Search Tool

## Overview

The CLI Search Tool allows you to test and run Google Scholar searches directly from the command line without needing the web interface. This is useful for:

- **Quick testing** of scraper functionality
- **Automated searches** via scripts or cron jobs
- **Debugging** scraper issues
- **Batch processing** multiple searches

## Installation

The CLI tool is already installed with the backend. No additional setup needed.

## Usage

### Basic Command

```bash
npm run cli -- --include "keyword1" "keyword2" --start-year 2020 --end-year 2023
```

Or directly:

```bash
cd backend
source venv/bin/activate
python3 cli_search.py --include "keyword1" "keyword2" --start-year 2020 --end-year 2023
deactivate
```

### Get Help

```bash
npm run cli:help
```

## Command-Line Options

| Option | Required | Description | Example |
|--------|----------|-------------|---------|
| `--include` | Yes | Keywords to include (space-separated) | `--include "AI" "machine learning"` |
| `--exclude` | No | Keywords to exclude | `--exclude "medical" "healthcare"` |
| `--start-year` | No | Starting year for search | `--start-year 2020` |
| `--end-year` | No | Ending year for search | `--end-year 2023` |
| `--max-results` | No | Maximum results to export | `--max-results 50` |
| `--output` | No | Output CSV filename (auto-generated if omitted) | `--output results.csv` |
| `--semantic-include` | No | Semantic inclusion criteria | `--semantic-include "practical applications"` |
| `--semantic-exclude` | No | Semantic exclusion criteria | `--semantic-exclude "purely theoretical"` |
| `--semantic-individual` | No | Analyze papers individually (default: batch mode) | `--semantic-individual` |
| `--no-wait` | No | Create job and exit without waiting | `--no-wait` |

## Examples

### Example 1: Simple Search

```bash
npm run cli -- --include "machine learning" --start-year 2022 --end-year 2023
```

Output file: `litrev_machine_2022-2023_001.csv`

### Example 2: Search with Exclusions

```bash
npm run cli -- \
  --include "artificial intelligence" "neural networks" \
  --exclude "medical" "healthcare" \
  --start-year 2020 \
  --end-year 2023 \
  --max-results 100
```

Output file: `litrev_artificial_neural_ex_medical_healthcare_2020-2023_001.csv`

### Example 3: Specific Keywords (Your Test Case)

```bash
npm run cli -- \
  --include "large language models" "mathematical reasoning" \
  --exclude "survey" "review" \
  --start-year 2022 \
  --end-year 2023 \
  --max-results 30
```

Output file: `litrev_large_mathematical_ex_survey_review_2022-2023_001.csv`

### Example 4: Custom Output File

```bash
npm run cli -- \
  --include "deep learning" \
  --start-year 2023 \
  --end-year 2023 \
  --output my_dl_papers_2023.csv
```

Output file: `my_dl_papers_2023.csv`

### Example 5: Background Job (No Wait)

```bash
npm run cli -- \
  --include "quantum computing" \
  --start-year 2020 \
  --end-year 2023 \
  --no-wait
```

Creates the job and exits immediately. Monitor with:
```bash
npm run logs:celery
```

### Example 6: Semantic Filtering (Batch Mode)

```bash
npm run cli -- \
  --include "machine learning" \
  --start-year 2023 \
  --end-year 2023 \
  --semantic-include "papers with practical applications and case studies" \
  --semantic-exclude "purely theoretical papers without experiments" \
  --max-results 50
```

Uses AI to filter papers based on semantic criteria. By default, analyzes papers in batches of 10.

### Example 7: Semantic Filtering (Individual Mode)

```bash
npm run cli -- \
  --include "deep learning" \
  --start-year 2023 \
  --end-year 2023 \
  --semantic-include "novel neural network architectures" \
  --semantic-individual \
  --max-results 30
```

Analyzes each paper individually for more thorough filtering (slower, more API calls).

## Auto-Generated Filenames

If you don't specify `--output`, the tool automatically generates a filename based on:

1. **Include keywords** (first 3 words)
2. **Exclude keywords** (first 2 words, prefixed with `ex_`)
3. **Year range**
4. **Sequential number** (prevents overwriting)

### Filename Examples

| Parameters | Generated Filename |
|------------|-------------------|
| Include: "AI", Years: 2022-2023 | `litrev_ai_2022-2023_001.csv` |
| Include: "machine learning", "deep learning", Exclude: "medical" | `litrev_machine_deep_ex_medical_2020-2023_001.csv` |
| Include: "large language models", Years: 2023 | `litrev_large_2023_001.csv` |

If the file already exists, the number increments:
- `litrev_ai_2022_001.csv`
- `litrev_ai_2022_002.csv`
- `litrev_ai_2022_003.csv`

## Output

### Terminal Output

The CLI tool displays:

1. **Banner** with tool name
2. **Search Parameters** - What you're searching for
3. **Job Creation** - Job ID and name
4. **Progress Bar** - Real-time progress with papers found
5. **Export Status** - When results are being exported
6. **Summary** - Final statistics

### Example Output

```
╔════════════════════════════════════════════════════════════════╗
║           LitRevTool CLI Search                                ║
║           Google Scholar Scraper via Internal API              ║
╚════════════════════════════════════════════════════════════════╝

Search Parameters
  Include Keywords: machine learning, deep learning
  Exclude Keywords: medical
  Year Range:       2020 - 2023
  Max Results:      50
  Output File:      litrev_machine_deep_ex_medical_2020-2023_001.csv (auto-generated)

Creating Search Job
✓ Job created: a1b2c3d4-e5f6-7890-abcd-ef1234567890
ℹ Job name: CLI Search: machine learning deep learning (2020-2023)
ℹ Triggering scraper task...
✓ Scraper task queued

Monitoring Job Progress
ℹ Status: RUNNING
Progress: [██████████████████████████████] 100.0% | Papers: 127 | Elapsed: 180s

Exporting Results
✓ Exported 50 papers to litrev_machine_deep_ex_medical_2020-2023_001.csv
ℹ File size: 45,234 bytes

Search Summary
  Job ID:          a1b2c3d4-e5f6-7890-abcd-ef1234567890
  Job Name:        CLI Search: machine learning deep learning (2020-2023)
  Status:          completed
  Papers Found:    127
  Total Time:      180.5s (3.0m)
  Output File:     litrev_machine_deep_ex_medical_2020-2023_001.csv

ℹ Multi-strategy scraper used - check logs for which strategy succeeded
ℹ Use 'npm run logs:celery' to see detailed scraping logs

✓ Search completed successfully!
```

### CSV Output

The CSV file contains:

| Column | Description |
|--------|-------------|
| Title | Paper title |
| Authors | Author names |
| Year | Publication year |
| Source | Journal/conference name |
| Publisher | Publisher name |
| Citations | Citation count |
| Abstract | Paper abstract/snippet |
| URL | Link to paper |
| Semantic_Score | 1 if paper passed semantic filtering, 0 otherwise |

**Note**: The `Semantic_Score` column shows whether a paper passed AI-powered semantic filtering (1 = passed, 0 = not passed or no filtering applied). Use `--semantic-include` and `--semantic-exclude` flags to enable semantic filtering in CLI searches.

### PRISMA Methodology Metrics

The CLI automatically displays PRISMA (Preferred Reporting Items for Systematic Reviews and Meta-Analyses) metrics at the end of each search:

```
PRISMA Methodology Metrics

Identification:
  Records identified:              1245

Screening:
  Duplicates removed:              45
  Records after deduplication:     1200
  Records screened:                1200

Eligibility:
  Papers assessed (semantic):      1200
  Papers excluded (semantic):      350

Included:
  Studies included in results:     850
```

These metrics provide transparency for systematic literature reviews and help you report your methodology according to PRISMA standards. The metrics track:

- **Identification**: Total papers found by the scraper
- **Screening**: Duplicates detected and removed
- **Eligibility**: Papers assessed and filtered by semantic criteria (if enabled)
- **Included**: Final paper count in your results

## Monitoring Progress

### Watch CLI Output

The CLI shows real-time progress:

```
Progress: [████████░░░░░░░░░░] 42.3% | Papers: 215 | Elapsed: 92s
```

### Monitor Celery Logs

In another terminal:

```bash
npm run logs:celery
```

You'll see which strategy is being used:

```
MultiStrategy: Trying scholarly strategy...
Scholarly: Searching for: "machine learning" "deep learning" -medical
Scholarly: Search complete - 127 papers found
MultiStrategy: scholarly succeeded with 127 papers (success rate: 100.00%)
```

### Check Job Status

```bash
npm run debug:last-job
```

Shows details of the most recent job.

## Interrupting a Search

Press `Ctrl+C` to interrupt:

```
^C
! Interrupted by user
ℹ Job will continue running in the background
ℹ Monitor with: npm run logs:celery
```

The job continues in the background. Results will still be available in the database.

## Troubleshooting

### Error: "Job failed"

Check Celery logs:

```bash
npm run logs:celery
```

Look for error messages indicating why the search failed.

### Error: No papers found

Possible causes:
1. **Too restrictive keywords** - Try broader search terms
2. **Year range has no papers** - Expand the date range
3. **Google Scholar blocking** - Wait 30 minutes and retry
4. **All strategies failed** - Check logs for details

### Error: File permission denied

Make sure the backend directory is writable:

```bash
chmod +w /home/ubuntu/litrevtool/backend
```

### Job stuck at "Initializing"

This is normal for the first ~30 seconds. The scraper needs to:
1. Try the scholarly strategy
2. Potentially fall back to requests strategy
3. Initialize browser/connections
4. Make first requests

Be patient, it will start showing progress.

## Advanced Usage

### Batch Processing

Create a script to run multiple searches:

```bash
#!/bin/bash

# search_batch.sh

npm run cli -- --include "AI" --start-year 2020 --end-year 2020 --no-wait
sleep 10

npm run cli -- --include "machine learning" --start-year 2021 --end-year 2021 --no-wait
sleep 10

npm run cli -- --include "deep learning" --start-year 2022 --end-year 2022 --no-wait
```

Run with:

```bash
chmod +x search_batch.sh
./search_batch.sh
```

**Important**: Add delays between jobs to avoid rate limiting.

### Cron Jobs

Schedule automated searches:

```bash
# Edit crontab
crontab -e

# Run search every Monday at 2 AM
0 2 * * 1 cd /home/ubuntu/litrevtool && npm run cli -- --include "AI research" --start-year 2024 --end-year 2024 --output weekly_ai_papers.csv
```

### Programmatic Usage

Import and use in Python scripts:

```python
import subprocess

def run_search(keywords, exclude=None, start_year=None, end_year=None):
    """Run a CLI search programmatically."""

    cmd = [
        'npm', 'run', 'cli', '--',
        '--include'
    ] + keywords

    if exclude:
        cmd += ['--exclude'] + exclude

    if start_year:
        cmd += ['--start-year', str(start_year)]

    if end_year:
        cmd += ['--end-year', str(end_year)]

    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.stdout

# Example
output = run_search(
    keywords=['machine learning'],
    exclude=['medical'],
    start_year=2022,
    end_year=2023
)
print(output)
```

## Performance Notes

### Search Duration

Typical search times:

| Scope | Estimated Time |
|-------|---------------|
| Single year, 10-50 papers | 1-3 minutes |
| Single year, 100-500 papers | 3-8 minutes |
| 2-3 years, multiple pages | 5-15 minutes |
| 5+ years, many results | 15-30 minutes |

Times depend on:
- Rate limiting (5-15 sec delays between requests)
- Which strategy succeeds
- Number of retries needed
- Google Scholar's response time

### Rate Limiting

The scraper uses ethical rate limiting:

- **Scholarly**: 1-2 seconds per request
- **Requests**: 5-10 seconds per request
- **Playwright**: 8-15 seconds per request

This prevents IP bans but makes searches slower.

### Max Results Behavior

The `--max-results` option limits **exported** papers, not scraped papers:

```bash
--max-results 30
```

- Scraper may find 100+ papers
- Only first 30 are exported to CSV
- All papers are saved to database
- Allows you to limit output file size while preserving full dataset

## Integration with Web UI

The CLI tool and web UI share the same:

- Database (papers saved by CLI are visible in UI)
- Job queue (both create jobs in Celery)
- Multi-strategy scraper

You can start a search in the CLI and monitor it in the web UI, or vice versa.

## Files Created

When you run a CLI search:

| File/Location | Description |
|---------------|-------------|
| `{output}.csv` | CSV export in current directory |
| `backend/uploads/search_{jobid}_{timestamp}.csv` | Server-side CSV |
| `backend/litrevtool.db` | Papers saved to database |
| `backend/uploads/screenshots/` | Browser screenshots (if Playwright used) |

## CLI User

The tool creates a special "CLI Test User" in the database:

- Email: `cli-test@litrevtool.local`
- Name: `CLI Test User`
- Google ID: `cli-test-user`

All CLI searches are associated with this user. You can see them in the web UI after logging in.

## Tips

1. **Start small** - Test with single year and `--max-results 10` first
2. **Use exclusions** - Narrow results with `--exclude "survey" "review"`
3. **Monitor logs** - Always check `npm run logs:celery` for issues
4. **Be patient** - Rate limiting means slow searches are normal
5. **Space out searches** - Wait 5-10 minutes between large searches
6. **Check outputs** - Verify CSV files have expected data
7. **Off-peak hours** - Search at night (UTC) for better success rates

## Comparison with Web UI

| Feature | CLI Tool | Web UI |
|---------|----------|--------|
| Create searches | ✅ | ✅ |
| Monitor progress | ✅ (terminal) | ✅ (live updates) |
| Download results | ✅ (automatic) | ✅ (download button) |
| View past searches | ❌ | ✅ |
| Semantic filtering | ✅ | ✅ |
| Semantic batch/individual mode | ✅ | ✅ |
| Email notifications | ❌ | ✅ |
| Batch processing | ✅ (scripts) | ❌ |
| Automation | ✅ (cron) | ❌ |
| Authentication | ❌ (auto) | ✅ (Google OAuth) |

## FAQ

**Q: Can I run multiple CLI searches simultaneously?**
A: Yes, but with caution. Space them out by 30-60 seconds to avoid overwhelming the scraper. The Celery worker processes jobs sequentially.

**Q: What if the CLI crashes?**
A: The job continues running in Celery. Check logs with `npm run logs:celery` and download results from the web UI.

**Q: Can I resume a failed CLI search?**
A: Yes, use the web UI's "Resume" button on failed jobs.

**Q: How do I see all CLI search results?**
A: Log into the web UI. All CLI searches are associated with "CLI Test User".

**Q: Can I delete the CLI test user?**
A: Yes, but the CLI will recreate it on next run.

**Q: Does the CLI use the multi-strategy scraper?**
A: Yes! It uses the same multi-strategy system as the web UI (scholarly → requests → playwright).

**Q: Should I use batch mode or individual mode for semantic filtering?**
A: Use batch mode (default) for most cases. It's faster and uses 10x fewer API calls. Only use individual mode (`--semantic-individual`) if you need more thorough analysis for a small number of papers.

**Q: How does semantic filtering affect API costs?**
A: Batch mode processes ~10 papers per API call. Individual mode makes 1 API call per paper. For 100 papers: batch = ~10 calls, individual = 100 calls.

## Troubleshooting

Run diagnostics:

```bash
# Check system health
npm run debug:health

# Check stuck jobs
npm run debug:jobs

# View recent errors
npm run debug:errors

# See last job details
npm run debug:last-job
```

## Related Documentation

- [Multi-Strategy Scraper](MULTI_STRATEGY_SCRAPER.md) - How the scraping works
- [CLAUDE.md](../CLAUDE.md) - Project overview
- [RESET.md](RESET.md) - System recovery procedures

---

**Last Updated**: November 6, 2025
**Version**: 1.0.0
**Author**: LitRevTool Team
