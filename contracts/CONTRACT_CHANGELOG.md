# Contract Changelog Policy

This changelog is mandatory for API contract changes.

## Rules

1. Any change to `services/*/src/swagger/swagger.js` must include:
   - a version bump in the changed swagger file (`info.version`)
   - a new changelog entry below
2. Run `npm run contracts:export` after updating swagger.
3. CI enforces:
   - no drift between swagger and `contracts/*.openapi.json`
   - changelog + version bump for contract changes

## Entries

### 2026-03-20

- Baseline contract governance introduced.
- Standard response envelope reflected in specs.
- OpenAPI discovery endpoints and gateway index added.
