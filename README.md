# HarborCFO — SME Finance Copilot

HarborCFO is an SME finance copilot built for the 2026 Shenzhen International FinTech Competition (Topic E).

## Documentation

Full architectural specifications and development plans live in the `docs/` directory:

- [Architecture & Conventions](docs/ARCHITECTURE.md)
- [Master Implementation Plan](docs/IMPLEMENTATION_PLAN.md)
- [Database Schema](docs/DB_SCHEMA.md)
- [Product Brief & Anchor Figures](docs/PRODUCT_BRIEF.md)
- [API Reference](docs/API_REFERENCE.md)
- [Rules for Coding Agents](AGENTS.md)

## Development Setup

### Prerequisites

- Node.js LTS (see `.nvmrc`, `>= 20.0.0`)
- pnpm `>= 9.0.0`
- MongoDB replica set (local or cloud)

### Quick Start

```bash
# Install dependencies
pnpm install

# Run type check across all workspaces
pnpm typecheck

# Run lint checks
pnpm lint

# Format code
pnpm format

# Run tests
pnpm test

# Run development servers (API & Web)
pnpm dev

# Seed demo data (Harbor Wholesale & Pearl Bakery via authentic import pipeline)
pnpm seed:demo

# Reset active demo tenant (requires ENABLE_DEMO_RESET=true)
pnpm reset:demo

# Run end-to-end evidence runner and generate verified artifact package
pnpm evidence:export
```

