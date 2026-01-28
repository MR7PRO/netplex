/**
 * Environment variable validation and access
 * Provides type-safe access to Vite environment variables
 */

interface EnvConfig {
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  SUPABASE_PROJECT_ID: string;
}

function getEnvVar(key: string): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

function validateEnv(): EnvConfig {
  return {
    SUPABASE_URL: getEnvVar('VITE_SUPABASE_URL'),
    SUPABASE_PUBLISHABLE_KEY: getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY'),
    SUPABASE_PROJECT_ID: getEnvVar('VITE_SUPABASE_PROJECT_ID'),
  };
}

// Validate on module load - will throw if missing
let env: EnvConfig;

try {
  env = validateEnv();
} catch (error) {
  // In development, log the error but don't crash
  console.error('Environment validation failed:', error);
  env = {
    SUPABASE_URL: '',
    SUPABASE_PUBLISHABLE_KEY: '',
    SUPABASE_PROJECT_ID: '',
  };
}

export { env };

/**
 * Check if all required environment variables are configured
 */
export function isEnvConfigured(): boolean {
  return Boolean(
    env.SUPABASE_URL && 
    env.SUPABASE_PUBLISHABLE_KEY && 
    env.SUPABASE_PROJECT_ID
  );
}

/**
 * Get a list of missing environment variables
 */
export function getMissingEnvVars(): string[] {
  const missing: string[] = [];
  
  if (!import.meta.env.VITE_SUPABASE_URL) {
    missing.push('VITE_SUPABASE_URL');
  }
  if (!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    missing.push('VITE_SUPABASE_PUBLISHABLE_KEY');
  }
  if (!import.meta.env.VITE_SUPABASE_PROJECT_ID) {
    missing.push('VITE_SUPABASE_PROJECT_ID');
  }
  
  return missing;
}
