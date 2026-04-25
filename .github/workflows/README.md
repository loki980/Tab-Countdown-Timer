# GitHub Actions CI/CD Pipeline

This directory contains the GitHub Actions workflows for the Tab Countdown Timer browser extension project.

## Workflows

### 1. CI Pipeline (`.github/workflows/ci.yml`)

**Triggers**:
- Push to master branch (repository default)
- Pull requests to master branch
- Manual workflow dispatch

**Jobs**:
- **test**: Runs on multiple Node.js versions (16.x, 18.x, 20.x)
  - Installs dependencies
  - Runs ESLint for code quality checks
  - Performs security audit
  - Executes Jest unit tests with coverage
  - Validates Chrome extension manifest
  - Builds extension package
  - Uploads build artifacts

### 2. Release Pipeline (`.github/workflows/release.yml`)

**Triggers**:
- New GitHub release publication

**Jobs**:
- **release**: Automated deployment to browser extension stores
  - Validates version consistency
  - Runs full test suite
  - Builds production bundle
  - Creates release assets
  - Uploads to GitHub release
  - Deploys to Chrome Web Store
  - Deploys to Edge Add-ons

### 3. Dependency Management (`.github/workflows/dependencies.yml`)

**Triggers**:
- Weekly schedule (Sundays at 00:00 UTC)
- Manual workflow dispatch

**Jobs**:
- **update-dependencies**: Automated dependency management
  - Checks for package updates
  - Performs security audit
  - Creates pull requests for updates

## Required Secrets

To enable the full CI/CD pipeline, configure these repository secrets:

### Chrome Web Store
- `CHROME_CLIENT_ID`: Chrome Web Store API client ID
- `CHROME_CLIENT_SECRET`: Chrome Web Store API client secret
- `CHROME_REFRESH_TOKEN`: Chrome Web Store API refresh token
- `CHROME_EXTENSION_ID`: Your extension ID from Chrome Web Store

### Edge Add-ons
- `EDGE_PRODUCT_ID`: Your extension product ID from Edge Add-ons
- `EDGE_DEV_TOKEN`: Edge Add-ons developer token

### Setup Instructions

1. **Chrome Web Store API Setup**:
   - Visit [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard)
   - Create API credentials
   - Add the above secrets to your GitHub repository

2. **Edge Add-ons API Setup**:
   - Visit [Microsoft Edge Add-ons Developer Dashboard](https://partner.microsoft.com/dashboard/microsoftedge)
   - Generate API token
   - Add the above secrets to your GitHub repository

## Usage

### Development Workflow
1. Make changes to your code
2. Commit and push to master branch (repository default)
3. CI pipeline runs automatically
4. Fix any issues found by linting or tests
5. Create a new release when ready:
   ```bash
   git tag v1.3.2
   git push origin v1.3.2
   ```
6. Create GitHub release with the tag
7. Release pipeline automatically deploys to stores

### Manual Testing
You can manually trigger workflows:
- **CI Pipeline**: Go to Actions → CI Pipeline → Run workflow
- **Dependency Update**: Go to Actions → Dependency Management → Run workflow

## Monitoring

- Check workflow status in the Actions tab of your GitHub repository
- View build artifacts from workflow runs
- Monitor test coverage reports
- Review security audit results

## Troubleshooting

### Common Issues
1. **Secrets Not Found**: Ensure all required secrets are configured
2. **Build Failures**: Check workflow logs for specific error messages
3. **Test Failures**: Run tests locally with `npm test`
4. **Linting Errors**: Run `npm run lint:fix` to auto-fix issues

### Debugging
- Enable debug logging in workflows by adding `ACTIONS_STEP_DEBUG: true` secret
- Use `npm run lint` and `npm test` locally before pushing
- Check workflow logs for detailed error information

## Maintenance

- Workflows use latest GitHub Actions versions
- Dependencies are automatically checked weekly
- Security audits run on every CI pipeline execution
- Build artifacts are retained for 7 days

## Best Practices

1. **Branch Protection**: Enable branch protection on main branch
2. **Required Checks**: Require CI to pass before merging
3. **Security**: Regularly rotate API tokens and secrets
4. **Monitoring**: Set up notifications for workflow failures
5. **Documentation**: Keep this README updated with any changes