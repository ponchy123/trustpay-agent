# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-22

### Added
- Agent registration with DID (Decentralized Identifier) support
- Agent identity verification using Terminal 3 Agent Auth SDK
- Policy-driven authorization system:
  - `max_daily_amount`: Daily spending limit
  - `allowed_merchants`: Merchant whitelist
  - `max_single_amount`: Single transaction limit
- TEE-secured payment execution (simulated)
- Tamper-proof audit logging with integrity hashes
- Compliance report generation
- TypeScript with strict type checking
- Unit tests with Jest (19 tests)
- Input validation for all public APIs
- Comprehensive error handling

### Security
- All sensitive operations designed for TEE isolation
- Cryptographic integrity verification for audit entries
- Verifiable credentials with DID support
- Policy-based access control

### Development
- TypeScript 6.0+
- Jest testing framework
- ts-node for development
- ESLint-ready configuration

## [0.1.0] - 2026-06-22

### Added
- Initial project structure
- Basic agent registration
- Simple payment flow
- README documentation