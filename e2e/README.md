# E2E Tests

## Setup

```bash
cd e2e
npm install
npx playwright install chromium
```

## Run Tests

```bash
# Start the app first
npm run dev --prefix ../dashboard

# Run all tests
npx playwright test

# Run with visible browser
npx playwright test --headed

# Run specific test file
npx playwright test landing.spec.js

# Generate report
npx playwright test --reporter=html
```
