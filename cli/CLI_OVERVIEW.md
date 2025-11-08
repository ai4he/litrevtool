# LitRevTool CLI - Technical Overview

## Purpose

The LitRevTool CLI provides a command-line interface to all LitRevTool functionality, enabling:
- Automation and scripting of literature review workflows
- Testing and debugging of the API
- Power users who prefer terminal interfaces
- CI/CD integration for automated research pipelines

## Design Philosophy

**API-First Architecture**: The CLI is a thin client that uses the existing FastAPI backend endpoints. This ensures:
- No duplicate business logic
- Changes to the API are automatically reflected in CLI
- Consistent behavior between web UI and CLI
- Easy to maintain and test

## Architecture

```
cli/
├── bin/
│   └── litrev.js              # Main executable (Commander.js)
├── lib/
│   ├── api-client.js          # Axios-based API wrapper
│   ├── commands/              # Command implementations
│   │   ├── login.js           # Auth & config
│   │   ├── create.js          # Create search jobs
│   │   ├── list.js            # List all jobs
│   │   ├── status.js          # Job details, resume, delete
│   │   ├── download.js        # Download results
│   │   └── watch.js           # Real-time monitoring
│   └── utils/
│       ├── config.js          # Persistent config (Conf library)
│       └── formatters.js      # Terminal output formatting
├── package.json
├── README.md                  # Full documentation
├── QUICK_START.md             # Quick reference
└── CLI_OVERVIEW.md            # This file
```

## Key Components

### API Client (`lib/api-client.js`)

- Wraps all backend API endpoints
- Handles authentication (Bearer token)
- Manages errors and connection issues
- Supports file downloads (CSV, PRISMA, LaTeX, BibTeX)

### Configuration Management (`lib/utils/config.js`)

- Uses `conf` library for persistent storage
- Stores: API URL, auth token, user info
- Location: `~/.config/litrevtool/config.json`
- Cross-platform compatible

### Output Formatting (`lib/utils/formatters.js`)

- Colored terminal output (Chalk)
- Tables (cli-table3)
- Status indicators
- PRISMA metrics display

### Commands

#### Authentication Commands
- `login` - OAuth flow (opens browser)
- `logout` - Clear credentials
- `whoami` - Show current user
- `config` - Manage settings

#### Job Management Commands
- `create` - Create new search job (interactive or CLI args)
- `list` - List all jobs with filtering
- `status` - Show detailed job info
- `watch` - Real-time progress monitoring
- `resume` - Resume failed jobs
- `delete` - Remove jobs

#### Download Commands
- `download` - Get results (CSV, PRISMA, LaTeX, BibTeX)

#### Utility Commands
- `health` - Check API connectivity
- `quickstart` - Show quick start guide

## Technology Stack

- **CLI Framework**: Commander.js (command parsing)
- **HTTP Client**: Axios (API requests)
- **Configuration**: Conf (persistent storage)
- **Interactive Prompts**: Inquirer.js
- **Terminal UI**: Chalk (colors), cli-table3 (tables), ora (spinners)
- **Node Version**: >=14.0.0

## Installation

### Development
```bash
cd cli
npm install
npm link  # Makes 'litrev' available globally
```

### From Project Root
```bash
npm run cli:install    # Install and link
npm run cli:uninstall  # Uninstall
```

## Usage Examples

### Basic Workflow
```bash
# Configure
litrev config --api http://localhost:8000
litrev config --token YOUR_TOKEN

# Create search
litrev create --interactive

# Monitor
litrev watch 42

# Download
litrev download 42 --output ./results
```

### Automation
```bash
# Scripted search
JOB_ID=$(litrev create \
  --query "quantum computing" \
  --year-from 2020 \
  --year-to 2023 \
  | grep "Job ID:" | cut -d' ' -f3)

# Wait for completion
while [[ $(litrev status $JOB_ID | grep "Status:") != *"COMPLETED"* ]]; do
  sleep 10
done

# Download
litrev download $JOB_ID
```

## API Endpoints Used

| Command | Endpoint | Method |
|---------|----------|--------|
| `create` | `/api/v1/search-jobs/` | POST |
| `list` | `/api/v1/search-jobs/?skip=0&limit=100` | GET |
| `status` | `/api/v1/search-jobs/{id}` | GET |
| `resume` | `/api/v1/search-jobs/{id}/resume` | POST |
| `delete` | `/api/v1/search-jobs/{id}` | DELETE |
| `download --csv` | `/api/v1/search-jobs/{id}/download` | GET |
| `download --prisma` | `/api/v1/search-jobs/{id}/download-prisma` | GET |
| `download --latex` | `/api/v1/search-jobs/{id}/download-latex` | GET |
| `download --bibtex` | `/api/v1/search-jobs/{id}/download-bibtex` | GET |
| `health` | `/health` | GET |

## Configuration File

Location: `~/.config/litrevtool/config.json`

```json
{
  "apiUrl": "http://localhost:8000",
  "token": "your_auth_token",
  "user": {
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

## Error Handling

- **Connection errors**: Clear message about API availability
- **Authentication errors**: Prompts to login/set token
- **API errors**: Displays server error messages
- **File errors**: Handles download failures gracefully

## Future Enhancements

- [ ] Implement OAuth device flow for true CLI login
- [ ] Add shell completions (bash, zsh, fish)
- [ ] Support for config profiles (dev, staging, prod)
- [ ] Batch operations (create multiple jobs from CSV)
- [ ] Export job data to different formats
- [ ] Interactive TUI mode with blessed/ink
- [ ] Progress bars for downloads
- [ ] Webhook notifications on job completion

## Testing

```bash
cd cli
npm test  # Run jest tests (when implemented)
```

## Maintenance

### Adding New Commands

1. Create command file in `lib/commands/`
2. Implement command function
3. Import and register in `bin/litrev.js`
4. Update documentation

### Adding New API Endpoints

1. Add method to `lib/api-client.js`
2. Use in command implementation
3. Test with backend

## Troubleshooting

### Command not found
```bash
npm run cli:install  # Reinstall
which litrev         # Check installation
```

### API connection errors
```bash
litrev health         # Check connectivity
litrev config --show  # Verify API URL
curl http://localhost:8000/health  # Test API directly
```

### Authentication issues
```bash
litrev config --show  # Check token
litrev config --token NEW_TOKEN  # Reset token
```

## Related Documentation

- [README.md](README.md) - User documentation
- [QUICK_START.md](QUICK_START.md) - Quick reference
- [../CLAUDE.md](../CLAUDE.md) - Main project documentation
- [../docs/](../docs/) - Backend API documentation

## Support

- GitHub Issues: https://github.com/yourusername/litrevtool/issues
- Backend API Docs: http://localhost:8000/docs
- Web Interface: http://localhost:3001
