# Testing the Demands Feature

## Prerequisites

For full automated Jest tests, you need MongoDB. Choose one option:

### Option 1: Use a real MongoDB instance
```bash
# Set MONGODB_URI environment variable
export MONGODB_URI="mongodb://your-mongo-host:27017/agrismart-test"
npm test
```

### Option 2: Start MongoDB locally with Docker
```bash
# Start MongoDB in Docker
docker run -d -p 27017:27017 --name mongo-test mongo:latest

# Run tests
MONGODB_URI="mongodb://localhost:27017/agrismart-test" npm test

# Cleanup
docker stop mongo-test && docker rm mongo-test
```

### Option 3: Manual integration test (requires running server)
```bash
# Terminal 1: Start the backend server
cd backend-server
npm run dev

# Terminal 2: Run the manual test script
cd backend-server
node test-demands-workflow.js
```

## Test Coverage

The demand feature includes:

### Happy Path Tests
- ✅ Buyer registration and authentication
- ✅ Farmer registration and authentication  
- ✅ Buyer creates a demand
- ✅ Farmer views open demands
- ✅ Farmer accepts a demand
- ✅ Notifications sent to buyer

### Edge Cases & Validations
- ✅ Unauthorized access rejection
- ✅ Role-based authorization (buyer vs farmer)
- ✅ Input validation (missing fields, invalid types)
- ✅ Cannot update/cancel non-open demands
- ✅ Non-owners cannot modify demands
- ✅ Concurrent accept attempts handled

### API Endpoints Tested
- POST /api/demands (create - buyer only)
- GET /api/demands (list - role-aware)
- GET /api/demands/:id (get by id)
- PUT /api/demands/:id (update - owner while open)
- DELETE /api/demands/:id (cancel - owner while open)
- POST /api/demands/:id/respond (accept/reject - farmer only)

## Viewing API Documentation

The Swagger UI includes all demand endpoints:

```bash
# Start swagger server
npm run swagger

# Open browser to:
http://localhost:5000/api-docs
```

Look for the "Demands" tag in the Swagger UI to see all endpoints with examples.

## Running Production Tests

For CI/CD or production testing without a persistent MongoDB:

```bash
# Install mongodb-memory-server (may require system dependencies)
npm install --save-dev mongodb-memory-server

# Run tests (will use in-memory MongoDB)
npm test
```

**Note**: mongodb-memory-server may fail in some container environments. If it does, use Option 1 or 2 above.

## Test Output Example

```
PASS tests/demands.test.js
  Demands flow (integration)
    ✓ register buyer and farmer (150ms)
    ✓ login users (80ms)
    ✓ buyer creates a demand (120ms)
    ✓ farmer accepts the demand (95ms)
    ✓ buyer cannot update accepted demand (40ms)

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
Time:        2.5s
```
