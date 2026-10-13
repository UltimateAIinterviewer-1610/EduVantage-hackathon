import { defineConfig } from 'vitest/config';
export default defineConfig({define:{'process.env.API_KEY':JSON.stringify('test-key')},test:{include:['tests/**/*.test.ts','tests/**/*.test.tsx']}});
