# LitRevTool CLI

Command-line interface for LitRevTool - the literature review tool that overcomes Google Scholar's 1000-paper limit.

## Features

- 🚀 Create and manage search jobs from the command line
- 📊 Real-time progress monitoring with `watch` command
- 📥 Download results in multiple formats (CSV, LaTeX, BibTeX, PRISMA)
- 🔍 Filter by year ranges, keywords, and semantic criteria
- 💾 Persistent configuration for API URL and authentication
- 🎨 Beautiful terminal output with colors and progress indicators

## Installation

### Local Development

```bash
cd cli
npm install
npm link
```

This will make the `litrev` command available globally on your system.

### From Package (Future)

```bash
npm install -g @litrevtool/cli
```

## Quick Start

1. **Configure the CLI**

```bash
# Set API URL
litrev config --api http://localhost:8000

# Or use interactive config
litrev config
```

2. **Set Authentication Token**

Since Google OAuth is web-based, you'll need to get a token from the web interface:

```bash
# Method 1: Get token from web interface
litrev login  # Opens browser to get token

# Method 2: Set token manually
litrev config --token YOUR_TOKEN_HERE
```

3. **Create Your First Search**

```bash
# Interactive mode (recommended for first-time users)
litrev create --interactive

# Or use command-line options
litrev create \
  --name "ML Research 2020-2023" \
  --query "machine learning" \
  --year-from 2020 \
  --year-to 2023 \
  --include "deep learning, neural networks" \
  --exclude "survey, review"
```

4. **Monitor Progress**

```bash
# Watch in real-time
litrev watch <job-id>

# Or check status periodically
litrev status <job-id>
```

5. **Download Results**

```bash
# Download all files
litrev download <job-id>

# Download specific files
litrev download <job-id> --csv
litrev download <job-id> --prisma
litrev download <job-id> --latex --bibtex

# Specify output directory
litrev download <job-id> --output ./results
```

## Commands

### Authentication & Configuration

#### `litrev login`

Login to LitRevTool (opens web interface for OAuth).

```bash
litrev login
litrev login --api http://localhost:8000
```

#### `litrev logout`

Logout and clear stored credentials.

```bash
litrev logout
```

#### `litrev whoami`

Show current user information.

```bash
litrev whoami
```

#### `litrev config`

Configure CLI settings.

```bash
# Interactive configuration
litrev config

# Set API URL
litrev config --api http://localhost:8000

# Set authentication token
litrev config --token YOUR_TOKEN

# Show current configuration
litrev config --show
```

### Search Jobs

#### `litrev create`

Create a new search job.

```bash
# Interactive mode
litrev create --interactive

# With all options
litrev create \
  --name "My Search" \
  --query "deep learning" \
  --year-from 2020 \
  --year-to 2023 \
  --include "neural networks, CNN" \
  --exclude "survey" \
  --semantic-criteria "Papers about image classification using CNNs" \
  --semantic-batch
```

Options:
- `-n, --name <name>` - Job name (default: "Search YYYY-MM-DD")
- `-q, --query <query>` - Search query (required)
- `--year-from <year>` - Start year
- `--year-to <year>` - End year
- `--include <keywords>` - Include keywords (comma-separated)
- `--exclude <keywords>` - Exclude keywords (comma-separated)
- `--semantic-criteria <criteria>` - AI-based filtering criteria
- `--semantic-batch` - Use batch mode for semantic filtering
- `-i, --interactive` - Interactive mode

#### `litrev list`

List all search jobs.

```bash
# List all jobs
litrev list

# Filter by status
litrev list --status completed
litrev list --status running
litrev list --status failed

# Pagination
litrev list --limit 50 --skip 10
```

#### `litrev status <job-id>`

Show detailed status of a search job.

```bash
litrev status 123
```

Shows:
- Job details (name, query, year range, keywords)
- Current status and progress
- PRISMA methodology metrics
- Available files for download
- Timestamps and duration

#### `litrev watch <job-id>`

Watch job progress in real-time.

```bash
# Default: update every 5 seconds
litrev watch 123

# Custom update interval
litrev watch 123 --interval 10
```

Press Ctrl+C to stop watching (job continues in background).

#### `litrev resume <job-id>`

Resume a failed search job.

```bash
litrev resume 123
```

#### `litrev delete <job-id>`

Delete a search job.

```bash
# With confirmation prompt
litrev delete 123

# Force delete without confirmation
litrev delete 123 --force
```

### Downloads

#### `litrev download <job-id>`

Download job results.

```bash
# Download all available files (default)
litrev download 123

# Download specific file types
litrev download 123 --csv
litrev download 123 --prisma
litrev download 123 --latex
litrev download 123 --bibtex

# Multiple types
litrev download 123 --csv --prisma

# Specify output directory
litrev download 123 --output ./my-results

# Force download even if job not completed
litrev download 123 --force
```

Downloaded files:
- `job_<id>_results.csv` - Paper data with citations and semantic scores
- `job_<id>_prisma_diagram.svg` - PRISMA flow diagram
- `job_<id>_review.tex` - LaTeX systematic review document
- `job_<id>_references.bib` - BibTeX citations

### Utilities

#### `litrev health`

Check API health.

```bash
litrev health
```

#### `litrev quickstart`

Show quick start guide.

```bash
litrev quickstart
```

## Configuration

The CLI stores configuration in your home directory:

```
~/.config/litrevtool/config.json
```

You can view the config file location:

```bash
litrev config --show
```

Configuration includes:
- `apiUrl` - Backend API URL
- `token` - Authentication token
- `user` - User information

## Environment Variables

You can also use environment variables:

```bash
export LITREV_API_URL=http://localhost:8000
export LITREV_TOKEN=your_token_here
```

Command-line options take precedence over environment variables.

## Examples

### Example 1: Basic Search

```bash
# Create a simple search
litrev create \
  --name "COVID-19 Research" \
  --query "COVID-19 treatment" \
  --year-from 2020 \
  --year-to 2023

# Output: Job created with ID 42

# Watch progress
litrev watch 42

# When complete, download results
litrev download 42 --output ./covid-research
```

### Example 2: Advanced Search with Semantic Filtering

```bash
# Create search with AI-based filtering
litrev create \
  --name "ML Image Classification" \
  --query "machine learning image classification" \
  --year-from 2018 \
  --year-to 2023 \
  --include "convolutional neural networks, deep learning" \
  --exclude "survey, review, tutorial" \
  --semantic-criteria "Original research papers that propose new CNN architectures for image classification on ImageNet or CIFAR datasets" \
  --semantic-batch

# The semantic filter will use AI to further refine results
```

### Example 3: Monitoring Multiple Jobs

```bash
# List all running jobs
litrev list --status running

# Check status of multiple jobs
for id in 1 2 3; do
  echo "Job $id:"
  litrev status $id
  echo ""
done
```

### Example 4: Automated Pipeline

```bash
#!/bin/bash

# Create search
JOB_ID=$(litrev create \
  --query "quantum computing" \
  --year-from 2020 \
  --year-to 2023 | grep "Job ID:" | cut -d' ' -f3)

echo "Created job $JOB_ID"

# Wait for completion
while true; do
  STATUS=$(litrev status $JOB_ID | grep "Status:" | awk '{print $2}')

  if [[ "$STATUS" == "COMPLETED" ]]; then
    echo "Job completed!"
    break
  elif [[ "$STATUS" == "FAILED" ]]; then
    echo "Job failed!"
    exit 1
  fi

  sleep 10
done

# Download results
litrev download $JOB_ID --output ./results
echo "Results downloaded to ./results"
```

## Troubleshooting

### Cannot connect to API

```bash
# Check if backend is running
litrev health

# Set correct API URL
litrev config --api http://localhost:8000

# Check config
litrev config --show
```

### Authentication errors

```bash
# Check if token is set
litrev config --show

# Get new token from web interface
litrev login

# Or set token manually
litrev config --token YOUR_TOKEN
```

### Job stuck or failed

```bash
# Check detailed status
litrev status <job-id>

# Try resuming
litrev resume <job-id>

# Check backend logs
cd ../backend
npm run logs:celery
```

## Development

### Project Structure

```
cli/
├── bin/
│   └── litrev.js           # Main executable
├── lib/
│   ├── api-client.js       # API wrapper
│   ├── commands/           # Command implementations
│   │   ├── login.js
│   │   ├── create.js
│   │   ├── list.js
│   │   ├── status.js
│   │   ├── download.js
│   │   └── watch.js
│   └── utils/
│       ├── config.js       # Configuration management
│       └── formatters.js   # Output formatting
├── package.json
└── README.md
```

### Adding New Commands

1. Create command file in `lib/commands/`
2. Export command function
3. Import and register in `bin/litrev.js`

### Testing

```bash
# Install in development mode
npm link

# Test commands
litrev --help
litrev health
litrev config --show

# Unlink when done
npm unlink -g @litrevtool/cli
```

## Contributing

Contributions are welcome! Please:

1. Test your changes thoroughly
2. Update documentation
3. Follow existing code style
4. Add examples for new features

## License

MIT

## Support

- Documentation: https://github.com/yourusername/litrevtool
- Issues: https://github.com/yourusername/litrevtool/issues
- Web Interface: http://localhost:3001 (development)
