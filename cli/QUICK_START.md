# LitRevTool CLI - Quick Start

Get started with the LitRevTool CLI in 5 minutes!

## Installation

```bash
# From project root
npm run cli:install
```

This will:
1. Install CLI dependencies
2. Make `litrev` command available globally
3. You're ready to go!

## Configuration

```bash
# Set API URL and token
litrev config --api http://localhost:8000
litrev config --token YOUR_TOKEN_HERE

# Or use interactive config
litrev config

# Verify configuration
litrev config --show
```

### Getting a Token

For now, you'll need to get a token from the web interface:

1. Start the backend: `npm start` (from project root)
2. Open http://localhost:8000/docs
3. Login via web interface at http://localhost:3001
4. Get your token and use: `litrev config --token YOUR_TOKEN`

## Basic Usage

### Create a Search

```bash
# Interactive mode (recommended)
litrev create --interactive

# Or with command-line options
litrev create \
  --name "My Research" \
  --query "machine learning" \
  --year-from 2020 \
  --year-to 2023
```

### Monitor Progress

```bash
# Real-time monitoring
litrev watch <job-id>

# One-time status check
litrev status <job-id>

# List all jobs
litrev list
```

### Download Results

```bash
# Download all files
litrev download <job-id>

# Download to specific directory
litrev download <job-id> --output ./my-results

# Download specific file types
litrev download <job-id> --csv --prisma
```

## Common Commands

| Command | Description |
|---------|-------------|
| `litrev create -i` | Create search interactively |
| `litrev list` | List all jobs |
| `litrev status <id>` | Show job details |
| `litrev watch <id>` | Monitor job real-time |
| `litrev download <id>` | Download results |
| `litrev resume <id>` | Resume failed job |
| `litrev delete <id>` | Delete a job |
| `litrev config --show` | Show configuration |
| `litrev health` | Check API health |
| `litrev --help` | Show all commands |

## Examples

### Example 1: Quick Search

```bash
litrev create \
  --query "COVID-19 vaccine" \
  --year-from 2020 \
  --year-to 2023

# Returns job ID, e.g., 42
litrev watch 42
```

### Example 2: Advanced Search with Filtering

```bash
litrev create \
  --name "ML Research" \
  --query "deep learning computer vision" \
  --year-from 2018 \
  --year-to 2023 \
  --include "CNN, neural networks" \
  --exclude "survey, review" \
  --semantic-criteria "Papers proposing new architectures for image classification" \
  --semantic-batch
```

### Example 3: Check and Download

```bash
# Check status
litrev status 42

# Download when ready
litrev download 42 --output ./results

# Files downloaded:
# - job_42_results.csv
# - job_42_prisma_diagram.svg
# - job_42_review.tex
# - job_42_references.bib
```

## Tips

- Use `--interactive` mode when learning the CLI
- Use `watch` command for real-time monitoring (updates every 5 seconds)
- Download results to a specific directory with `--output`
- Check `litrev --help` for all available options
- Use `litrev quickstart` to see this guide anytime

## Troubleshooting

### "Cannot connect to API"

```bash
# Check backend is running
cd /path/to/litrevtool
npm start

# Verify API URL
litrev config --show

# Test connection
litrev health
```

### "Not logged in"

```bash
# Set your token
litrev config --token YOUR_TOKEN

# Verify
litrev whoami
```

### "Command not found: litrev"

```bash
# Reinstall CLI
cd /path/to/litrevtool
npm run cli:install
```

## Next Steps

- Read full documentation: [README.md](README.md)
- Learn about semantic filtering for AI-based paper selection
- Explore PRISMA methodology tracking
- Set up automated pipelines with bash scripts

## Uninstallation

```bash
# From project root
npm run cli:uninstall
```

Happy researching! 🎓📚
