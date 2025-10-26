import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "68f81f10a039cb25fee3024b", 
  requiresAuth: true // Ensure authentication is required for all operations
});
