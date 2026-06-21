# Contributing to TrustPay

Thank you for your interest in contributing to TrustPay! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/trustpay-agent.git
cd trustpay-agent

# Install dependencies
npm install

# Run tests
npm test

# Run the demo
npm run dev
```

## Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation changes
- `test/description` - Test additions/fixes

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new authorization policy
fix: resolve payment timeout issue
docs: update API documentation
test: add edge case tests for audit logger
```

### Code Style

- Use TypeScript strict mode
- Follow existing code patterns
- Add tests for new functionality
- Update documentation as needed

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- --testPathPattern=agent-sdk
```

### Code Quality

```bash
# Type check
npm run lint

# Build
npm run build
```

## Project Structure

```
trustpay-agent/
├── src/
│   ├── index.ts          # CLI demo
│   ├── server.ts         # Express API server
│   ├── agent-sdk.ts      # Agent Auth SDK wrapper
│   ├── payment.ts        # Payment processor
│   ├── audit.ts          # Audit logger
│   ├── models.ts         # TypeScript interfaces
│   ├── storage.ts        # JSON persistence
│   ├── logger.ts         # Logging system
│   └── ratelimit.ts      # Rate limiter
├── src/*.test.ts         # Test files
├── package.json
└── README.md
```

## Adding Features

### 1. New Authorization Policy

1. Add policy type to `models.ts`
2. Implement check in `agent-sdk.ts`
3. Add tests in `agent-sdk.test.ts`
4. Update documentation

### 2. New Payment Feature

1. Add to `PaymentProcessor` class
2. Add API endpoint in `server.ts` (if applicable)
3. Add tests
4. Update documentation

### 3. New Audit Feature

1. Add to `AuditLogger` class
2. Add API endpoint in `server.ts` (if applicable)
3. Add tests
4. Update documentation

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Add/update tests
4. Update documentation if needed
5. Run `npm test` and `npm run lint`
6. Create a pull request with:
   - Clear description
   - Link to related issues
   - Screenshots (if applicable)

## Reporting Issues

- Use GitHub Issues
- Include reproduction steps
- Include error messages
- Include environment info (OS, Node version)

## Code of Conduct

- Be respectful
- Welcome newcomers
- Focus on constructive feedback
- Help others learn

## Questions?

Open an issue or reach out to the maintainers.
