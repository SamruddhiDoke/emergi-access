import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Test files share one database, so they run sequentially.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ||
        'postgresql://emergi:emergi_dev_password@localhost:5433/emergi_access_test?schema=public',
      DEMO_MODE: 'true',
      DEMO_OTP: '',
      DISABLE_RATE_LIMIT: 'true',
      REDIS_URL: '',
    },
  },
});
