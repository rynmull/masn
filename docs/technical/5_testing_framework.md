# Testing Framework Documentation

## Overview
The Masn AAC platform implements a comprehensive testing strategy across all layers of the application, including unit tests, integration tests, end-to-end tests, and accessibility testing.

## Test Stack

### Core Testing Tools
- Jest: Primary test runner and assertion library
- React Testing Library: Component testing
- Cypress: End-to-end testing
- Axe-core: Accessibility testing
- Supertest: API testing

## Unit Testing

### Component Tests
```typescript
// Example component test using React Testing Library
import { render, fireEvent, screen } from '@testing-library/react';
import { SymbolGrid } from '../components/SymbolGrid';

describe('SymbolGrid', () => {
  it('renders correct number of symbols', () => {
    const symbols = [/* test data */];
    render(<SymbolGrid symbols={symbols} />);
    expect(screen.getAllByRole('button')).toHaveLength(symbols.length);
  });

  it('handles symbol selection', () => {
    const onSelect = jest.fn();
    render(<SymbolGrid onSelect={onSelect} />);
    fireEvent.click(screen.getByText('TestSymbol'));
    expect(onSelect).toHaveBeenCalledWith(expect.any(Object));
  });
});
```

### Service Tests
```typescript
// Example service test
import { SymbolProcessor } from '../services/SymbolProcessor';

describe('SymbolProcessor', () => {
  let processor: SymbolProcessor;

  beforeEach(() => {
    processor = new SymbolProcessor();
  });

  it('combines symbols correctly', async () => {
    const symbols = [/* test data */];
    const result = await processor.combineSymbols(symbols);
    expect(result).toBe('expected output');
  });
});
```

## Integration Testing

### API Tests
```typescript
// Example API test using Supertest
import request from 'supertest';
import { app } from '../app';

describe('Symbol API', () => {
  it('GET /api/symbols returns symbols list', async () => {
    const response = await request(app)
      .get('/api/symbols')
      .expect(200);
    
    expect(response.body).toHaveProperty('symbols');
    expect(Array.isArray(response.body.symbols)).toBe(true);
  });
});
```

### Database Tests
```typescript
// Example database integration test
import { SymbolRepository } from '../repositories/SymbolRepository';
import { dbConnection } from '../database';

describe('SymbolRepository', () => {
  let repository: SymbolRepository;

  beforeAll(async () => {
    await dbConnection.migrate.latest();
  });

  afterAll(async () => {
    await dbConnection.destroy();
  });

  beforeEach(async () => {
    repository = new SymbolRepository(dbConnection);
    await dbConnection.seed.run();
  });

  it('creates and retrieves symbols', async () => {
    const symbol = {/* test data */};
    const created = await repository.create(symbol);
    const retrieved = await repository.findById(created.id);
    expect(retrieved).toEqual(created);
  });
});
```

## End-to-End Testing

### Cypress Tests
```typescript
// Example Cypress test
describe('Symbol Grid Interaction', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/symbols');
  });

  it('allows symbol selection and speech output', () => {
    cy.get('[data-testid="symbol-grid"]')
      .find('.symbol')
      .first()
      .click();

    cy.get('[data-testid="speech-output"]')
      .should('have.text', 'Expected Text');
  });

  it('supports keyboard navigation', () => {
    cy.get('[data-testid="symbol-grid"]')
      .find('.symbol')
      .first()
      .focus()
      .type('{rightarrow}')
      .should('have.class', 'focused');
  });
});
```

## Accessibility Testing

### Automated Tests
```typescript
// Example accessibility test using axe-core
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('SymbolGrid Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<SymbolGrid />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### Manual Testing Checklist
```markdown
## Keyboard Navigation
- [ ] All interactive elements are focusable
- [ ] Tab order is logical
- [ ] Focus indicators are visible
- [ ] Keyboard shortcuts work as expected

## Screen Reader Support
- [ ] All images have appropriate alt text
- [ ] Dynamic content updates are announced
- [ ] ARIA landmarks are properly used
- [ ] Form controls have associated labels
```

## Performance Testing

### Load Tests
```typescript
// Example k6 load test
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  const res = http.get('http://localhost:4000/api/symbols');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  sleep(1);
}
```

## Test Configuration

### Jest Configuration (jest.config.js)
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: [
    '<rootDir>/src/setupTests.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Cypress Configuration (cypress.config.ts)
```typescript
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
```

## Continuous Integration

### Test Workflow
```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run unit tests
        run: npm run test:unit
      - name: Run integration tests
        run: npm run test:integration
      - name: Run E2E tests
        run: npm run test:e2e
      - name: Upload coverage
        uses: actions/upload-artifact@v2
        with:
          name: coverage
          path: coverage/
```