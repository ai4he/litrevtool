const inquirer = require('inquirer');
const open = require('open');
const config = require('../utils/config');
const apiClient = require('../api-client');
const { success, error, info, warning } = require('../utils/formatters');

async function loginCommand(options) {
  try {
    const apiUrl = options.api || config.getApiUrl();
    config.setApiUrl(apiUrl);

    info(`Logging in to ${apiUrl}...`);

    // For now, we'll use a simple token-based approach
    // In a real implementation, you might want to:
    // 1. Open browser for OAuth flow
    // 2. Start local server to catch callback
    // 3. Exchange code for token

    warning('Google OAuth login via CLI is not yet implemented.');
    info('Please use one of these methods:');
    console.log('');
    console.log('1. Use the web interface to login and get a token:');
    console.log(`   Open: ${apiUrl}/docs`);
    console.log('   Then use: litrev config --token YOUR_TOKEN');
    console.log('');
    console.log('2. For development, you can set a token manually:');
    console.log('   litrev config --token YOUR_TOKEN');
    console.log('');

    // Offer to open browser
    const { openBrowser } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'openBrowser',
        message: 'Open web interface in browser?',
        default: true
      }
    ]);

    if (openBrowser) {
      await open(`${apiUrl}/docs`);
      success('Opened web interface in your browser');
    }

  } catch (err) {
    error(`Login failed: ${err.message}`);
    process.exit(1);
  }
}

async function logoutCommand() {
  config.logout();
  success('Logged out successfully');
}

async function whoamiCommand() {
  try {
    if (!config.isAuthenticated()) {
      warning('Not logged in');
      info('Use "litrev login" to authenticate');
      return;
    }

    const user = config.getUser();
    if (user) {
      console.log('');
      console.log(`Name:  ${user.name || 'N/A'}`);
      console.log(`Email: ${user.email || 'N/A'}`);
      console.log('');
    } else {
      // Try to fetch user info from API
      const userData = await apiClient.getCurrentUser();
      config.setUser(userData);
      console.log('');
      console.log(`Name:  ${userData.name || 'N/A'}`);
      console.log(`Email: ${userData.email || 'N/A'}`);
      console.log('');
    }

  } catch (err) {
    error(`Failed to get user info: ${err.message}`);
    process.exit(1);
  }
}

async function configCommand(options) {
  if (options.token) {
    config.setToken(options.token);
    success('Token saved successfully');
    return;
  }

  if (options.api) {
    config.setApiUrl(options.api);
    success(`API URL set to: ${options.api}`);
    return;
  }

  if (options.show) {
    console.log('');
    console.log('Current configuration:');
    console.log(`  API URL: ${config.getApiUrl()}`);
    console.log(`  Token:   ${config.getToken() ? '***' + config.getToken().slice(-8) : 'Not set'}`);
    console.log(`  User:    ${config.getUser()?.email || 'Not set'}`);
    console.log(`  Config:  ${config.getConfigPath()}`);
    console.log('');
    return;
  }

  // Interactive config
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'apiUrl',
      message: 'API URL:',
      default: config.getApiUrl()
    },
    {
      type: 'password',
      name: 'token',
      message: 'Access Token (leave empty to skip):',
      mask: '*'
    }
  ]);

  if (answers.apiUrl) {
    config.setApiUrl(answers.apiUrl);
  }

  if (answers.token) {
    config.setToken(answers.token);
  }

  success('Configuration saved');
}

module.exports = {
  loginCommand,
  logoutCommand,
  whoamiCommand,
  configCommand
};
