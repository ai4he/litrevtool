/**
 * Generate a test authentication token for the test suite
 */
const { createAccessToken } = require('./dist/core/security');

// Use the existing test user ID
const userId = 'c3febeff-8bec-4aff-b52f-000fe671255d';

// Generate token (valid for 24 hours for testing)
const token = createAccessToken({ sub: userId }, 24 * 60);

console.log(token);
