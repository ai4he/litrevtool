# CI/CD Setup Guide

This guide explains how to set up and configure the CI/CD pipeline for LitRevTool.

## Table of Contents

- [Overview](#overview)
- [GitHub Actions Setup](#github-actions-setup)
- [Secrets Configuration](#secrets-configuration)
- [Branch Protection](#branch-protection)
- [Deployment Setup](#deployment-setup)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Overview

LitRevTool uses **GitHub Actions** for continuous integration and continuous deployment (CI/CD).

### Pipeline Architecture

```
┌─────────────┐
│  Git Push   │
└──────┬──────┘
       │
       ├──────────────────┬────────────────┬─────────────────┐
       │                  │                │                 │
       v                  v                v                 v
┌──────────────┐  ┌──────────────┐  ┌────────────┐  ┌────────────┐
│   Backend    │  │   Frontend   │  │  Security  │  │   Build    │
│    Tests     │  │    Tests     │  │    Scan    │  │   Docker   │
└──────┬───────┘  └──────┬───────┘  └─────┬──────┘  └─────┬──────┘
       │                  │                │               │
       └──────────────────┴────────────────┴───────────────┘
                          │
                          v
                   ┌──────────────┐
                   │    Deploy    │
                   │(main branch) │
                   └──────────────┘
```

### Features

- ✅ Automated testing on every push/PR
- ✅ Multi-version testing (Python 3.11, 3.12 / Node 18, 20)
- ✅ Code quality checks (linting, formatting)
- ✅ Security scanning
- ✅ Coverage reporting
- ✅ Parallel test execution
- ✅ Deployment automation (configurable)

## GitHub Actions Setup

### Prerequisites

1. GitHub repository with LitRevTool code
2. GitHub Actions enabled (enabled by default)
3. Repository secrets configured
4. Branch protection rules (optional but recommended)

### Workflow File

The main workflow is defined in `.github/workflows/ci.yml`.

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Manual workflow dispatch

### Jobs Breakdown

#### 1. Backend Tests

**Matrix Strategy:**
- Python 3.11
- Python 3.12

**Steps:**
1. Checkout code
2. Set up Python
3. Install dependencies
4. Lint with flake8
5. Format check with black
6. Import check with isort
7. Type check with mypy
8. Run unit tests
9. Run integration tests
10. Run API tests
11. Upload coverage

**Services:**
- Redis 7 (for Celery tests)

#### 2. Frontend Tests

**Matrix Strategy:**
- Node.js 18
- Node.js 20

**Steps:**
1. Checkout code
2. Set up Node.js
3. Install dependencies
4. Lint with ESLint
5. Run Jest tests
6. Build production bundle
7. Upload coverage

#### 3. Security Scan

**Tools:**
- Trivy (filesystem scanner)
- Safety (Python dependency checker)

**Steps:**
1. Scan codebase with Trivy
2. Upload SARIF to GitHub Security
3. Check Python dependencies

#### 4. Build Docker Images

**Conditions:**
- Only on `main` branch
- Only on push events

**Steps:**
1. Build backend Docker image
2. Build frontend Docker image
3. Use layer caching for speed

#### 5. Deploy

**Conditions:**
- Only on `main` branch
- Only after all tests pass

**Customizable for:**
- SSH deployment
- Docker deployment
- Cloud platform deployment (AWS, GCP, Azure)
- Kubernetes deployment

## Secrets Configuration

### Required Secrets

Add these to GitHub repository settings (Settings → Secrets and variables → Actions):

| Secret Name | Description | Required |
|------------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key for LaTeX generation | Optional* |
| `CODECOV_TOKEN` | Codecov.io token for coverage reports | Optional |
| `DEPLOY_SSH_KEY` | SSH private key for deployment | Optional** |
| `DEPLOY_HOST` | Deployment server hostname | Optional** |
| `DEPLOY_USER` | Deployment server username | Optional** |

*Tests will use mock values if not provided
**Only needed if using SSH deployment

### Adding Secrets

1. Go to GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add name and value
5. Click **Add secret**

### Environment Variables

The following environment variables are set automatically in CI:

```yaml
DATABASE_URL: sqlite:///:memory:
REDIS_URL: redis://localhost:6379/15
CELERY_BROKER_URL: redis://localhost:6379/15
SECRET_KEY: test-secret-key-for-ci
```

## Branch Protection

Recommended branch protection rules for `main` branch:

### Setup

1. Go to **Settings** → **Branches**
2. Click **Add branch protection rule**
3. Configure as follows:

### Recommended Settings

```yaml
Branch name pattern: main

✅ Require a pull request before merging
  ✅ Require approvals: 1
  ✅ Dismiss stale pull request approvals when new commits are pushed

✅ Require status checks to pass before merging
  ✅ Require branches to be up to date before merging
  Status checks:
    - backend-tests (Python 3.11)
    - backend-tests (Python 3.12)
    - frontend-tests (Node 18)
    - frontend-tests (Node 20)
    - security-scan

✅ Require conversation resolution before merging

✅ Include administrators

✅ Allow force pushes (for maintainers only)
```

## Deployment Setup

### Option 1: SSH Deployment

For deploying to a VM or bare-metal server:

#### 1. Add Secrets

```bash
# Generate SSH key on your local machine
ssh-keygen -t ed25519 -f ~/.ssh/litrevtool_deploy -C "litrevtool-deploy"

# Add public key to deployment server
ssh-copy-id -i ~/.ssh/litrevtool_deploy.pub user@server

# Add private key as GitHub secret
# Name: DEPLOY_SSH_KEY
# Value: (contents of ~/.ssh/litrevtool_deploy)
```

#### 2. Update Workflow

Replace the placeholder deploy job in `.github/workflows/ci.yml`:

```yaml
deploy:
  name: Deploy to Production
  runs-on: ubuntu-latest
  needs: [backend-tests, frontend-tests, security-scan]
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'

  steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup SSH
      run: |
        mkdir -p ~/.ssh
        echo "${{ secrets.DEPLOY_SSH_KEY }}" > ~/.ssh/deploy_key
        chmod 600 ~/.ssh/deploy_key
        ssh-keyscan -H ${{ secrets.DEPLOY_HOST }} >> ~/.ssh/known_hosts

    - name: Deploy to server
      run: |
        ssh -i ~/.ssh/deploy_key ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }} << 'EOF'
          cd /home/ubuntu/litrevtool
          git pull origin main
          npm run deploy
        EOF
```

### Option 2: Docker Deployment

For deploying with Docker:

```yaml
deploy:
  name: Deploy with Docker
  runs-on: ubuntu-latest
  needs: [backend-tests, frontend-tests, build-docker]

  steps:
    - name: Login to Docker Hub
      uses: docker/login-action@v3
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}

    - name: Push images
      run: |
        docker push litrevtool-backend:latest
        docker push litrevtool-frontend:latest

    - name: Deploy via SSH
      run: |
        ssh ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }} << 'EOF'
          cd /home/ubuntu/litrevtool
          docker-compose pull
          docker-compose up -d
        EOF
```

### Option 3: Cloud Platform

For AWS, GCP, Azure, etc., use platform-specific actions:

- AWS: `aws-actions/configure-aws-credentials`
- GCP: `google-github-actions/auth`
- Azure: `azure/login`

## Monitoring

### View Workflow Runs

1. Go to **Actions** tab in GitHub
2. Click on a workflow run to see details
3. Click on a job to see logs

### Status Badge

Add a status badge to README.md:

```markdown
![CI/CD](https://github.com/YOUR_USERNAME/litrevtool/workflows/CI%2FCD%20Pipeline/badge.svg)
```

### Codecov Integration

1. Sign up at [codecov.io](https://codecov.io)
2. Add your repository
3. Copy upload token
4. Add as `CODECOV_TOKEN` secret
5. View coverage reports at codecov.io

### Email Notifications

GitHub automatically sends emails for:
- Failed workflows on your branches
- Failed workflows on watched repositories

Configure in GitHub Settings → Notifications

## Advanced Configuration

### Conditional Deployments

Deploy only on version tags:

```yaml
deploy:
  if: startsWith(github.ref, 'refs/tags/v')
```

### Manual Approval

Use environments for manual approval:

```yaml
deploy:
  environment:
    name: production
    url: https://litrev.haielab.org
```

Then configure environment protection rules in Settings → Environments.

### Slack Notifications

Add Slack notification on failure:

```yaml
- name: Slack notification
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Performance Optimization

#### Cache Dependencies

Already configured in workflow:

```yaml
- uses: actions/setup-python@v5
  with:
    cache: 'pip'
```

#### Parallel Testing

Backend tests run in parallel using pytest-xdist:

```bash
pytest -n auto
```

#### Conditional Jobs

Skip unnecessary jobs:

```yaml
security-scan:
  if: github.event_name == 'pull_request'
```

## Troubleshooting

### Common Issues

#### Tests Pass Locally but Fail in CI

**Cause:** Environment differences

**Solution:**
- Check Python/Node versions match CI
- Verify all dependencies in requirements.txt
- Check environment variables

#### Redis Connection Fails

**Cause:** Redis service not available

**Solution:**
- Ensure Redis service is defined in workflow
- Use correct Redis URL in tests
- Check service health checks

#### Permission Denied Errors

**Cause:** Missing permissions for workflow

**Solution:**
- Check repository permissions
- Verify GITHUB_TOKEN has required permissions
- Check workflow permissions in `.github/workflows/ci.yml`

#### Secrets Not Available

**Cause:** Secret name mismatch or not defined

**Solution:**
- Verify secret name matches exactly
- Check secret is defined in repository settings
- Secrets are not available in pull requests from forks (for security)

### Debug Mode

Enable debug logging:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add secret: `ACTIONS_STEP_DEBUG` = `true`
3. Re-run workflow

### Re-running Jobs

- Click **Re-run failed jobs** to retry only failed jobs
- Click **Re-run all jobs** to run entire workflow again

## Best Practices

1. **Keep workflows fast** - Use caching and parallel execution
2. **Fail fast** - Run quick checks first
3. **Use matrix builds** - Test multiple versions
4. **Separate concerns** - Different jobs for different tasks
5. **Monitor costs** - GitHub Actions has usage limits
6. **Review logs** - Check workflow logs regularly
7. **Update dependencies** - Keep actions up to date
8. **Security first** - Never commit secrets
9. **Document changes** - Update this guide when changing workflows
10. **Test locally** - Use `act` to test workflows locally

## Local Testing

### Using `act`

Test workflows locally with [act](https://github.com/nektos/act):

```bash
# Install act
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run workflow
act push

# Run specific job
act -j backend-tests

# Use specific event
act pull_request
```

## Migration from Other CI/CD

### From Travis CI

Key differences:
- Workflow file in `.github/workflows/` instead of `.travis.yml`
- Matrix configuration syntax different
- Services defined per-job, not global
- Environment variables set differently

### From CircleCI

Key differences:
- YAML structure different
- No `workflows` section needed
- Jobs run independently by default
- Caching syntax different

### From Jenkins

Key differences:
- Declarative YAML instead of Groovy
- Runners managed by GitHub
- No need to manage build servers
- Built-in Docker support

## Resources

- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Workflow Syntax](https://docs.github.com/actions/reference/workflow-syntax-for-github-actions)
- [GitHub Actions Marketplace](https://github.com/marketplace?type=actions)
- [act - Local Testing](https://github.com/nektos/act)

## Support

For CI/CD issues:
1. Check GitHub Actions status page
2. Review workflow logs
3. Enable debug logging
4. Create issue on GitHub repository
