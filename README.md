# BookMyEvent — Event Booking Platform with Authentication

This repository contains the **PostgreSQL schema** and **Express + TypeScript REST API** for BookMyEvent, managed via **Prisma** with full JWT-based authentication.

## Features

- ✅ **Full Authentication System** with JWT tokens
- ✅ **User Management** (signup, login, logout, token refresh)
- ✅ **Secure Password Hashing** with bcrypt
- ✅ **Environment Variable Validation** with Zod
- ✅ **TypeScript** for type safety
- ✅ **PostgreSQL Database** with Prisma ORM
- ✅ **Express REST API** with proper error handling

## What's included

- Prisma schema: `prisma/schema.prisma`
- Version-controlled migrations: `prisma/migrations/*`
- Express + TypeScript API: `src/*`
- Optional local PostgreSQL via Docker Compose: `docker-compose.yml`
- Authentication endpoints: signup, login, refresh, logout, me

## Documentation

- Schema relationships and ER diagram: [docs/DB_SCHEMA.md](docs/DB_SCHEMA.md)
- API endpoints: [API.md](API.md)

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for local PostgreSQL)
- PostgreSQL 16+ (if not using Docker)

## Quick start (local)

### 1. Set up the database

```bash
# Start PostgreSQL container
docker compose up -d

# Wait a few seconds for database to be ready
sleep 5
```

### 2. Install dependencies and configure environment

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env and update values as needed
# The default values work with the docker-compose setup
```

### 3. Run database migrations

```bash
# Apply all migrations
npm run db:migrate

# Or for development (creates migrations)
npm run db:migrate:dev
```

### 4. Start the development server

```bash
# Start the server with hot reload
npm run dev

# Or build and run production
npm run build
npm start
```

The server will start on `http://localhost:3000` (or the port specified in `.env`)

## Environment Variables

Required environment variables (see `.env.example`):

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bookmyevent?schema=public"
JWT_SECRET="your-secret-key-change-in-production"
JWT_ACCESS_TOKEN_EXPIRY="15m"
JWT_REFRESH_TOKEN_EXPIRY="7d"
PORT=3000
NODE_ENV="development"
```

## API Endpoints

### Health Check
- `GET /health` - Check if server is running

### Authentication
- `POST /api/auth/signup` - Create a new user account
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout (requires authentication)
- `GET /api/auth/me` - Get current user info (requires authentication)

See [API.md](API.md) for detailed API documentation with request/response examples.

## Testing the API

You can test the authentication endpoints using the provided test script:

```bash
# Make sure the server is running first
npm run dev

# In another terminal, run the test script
./test-auth.sh
```

Or use curl/Postman/Insomnia to test manually.

## Project Structure

```
bookmyevent/
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Version-controlled migrations
├── src/
│   ├── config/                 # Configuration files
│   │   ├── database.ts         # Prisma client setup
│   │   └── env.ts              # Environment validation
│   ├── controllers/            # Route controllers
│   │   └── auth.controller.ts  # Authentication logic
│   ├── middleware/             # Express middleware
│   │   └── auth.ts             # JWT authentication middleware
│   ├── routes/                 # API routes
│   │   ├── auth.routes.ts      # Auth endpoints
│   │   └── index.ts            # Route aggregation
│   ├── types/                  # TypeScript types
│   │   └── auth.ts             # Auth-related types
│   ├── utils/                  # Utility functions
│   │   ├── jwt.ts              # JWT token handling
│   │   ├── password.ts         # Password hashing
│   │   └── validation.ts       # Input validation schemas
│   └── server.ts               # Express app entry point
├── .env                        # Environment variables (gitignored)
├── .env.example                # Environment template
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
└── docker-compose.yml          # PostgreSQL container
```

## Development Scripts

```bash
npm run dev              # Start dev server with hot reload
npm run build            # Build TypeScript to JavaScript
npm start                # Run production build
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Apply migrations (production)
npm run db:migrate:dev   # Create and apply migrations (dev)
npm run db:studio        # Open Prisma Studio (DB GUI)
```

## Security Notes

1. **Passwords** are hashed using bcrypt with 10 salt rounds
2. **JWT tokens** are signed with a secret key (configurable via `JWT_SECRET`)
3. Always use **HTTPS** in production
4. Store tokens securely on the client side (httpOnly cookies recommended)
5. The default `JWT_SECRET` in `.env.example` is for development only - **change it in production**
6. Consider implementing token blacklisting for production use cases
7. Implement rate limiting for authentication endpoints in production

## License

See [LICENSE](LICENSE) file for details.
