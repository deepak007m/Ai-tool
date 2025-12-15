# Authentication Implementation Documentation

## Overview

This document describes the authentication system implementation for BookMyEvent. The system uses JWT (JSON Web Tokens) for authentication with bcrypt for secure password hashing.

## Architecture

### Technology Stack

- **Runtime:** Node.js with TypeScript
- **Web Framework:** Express.js
- **Database:** PostgreSQL via Prisma ORM
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcrypt
- **Validation:** Zod
- **Environment Management:** dotenv

### Directory Structure

```
src/
├── config/
│   ├── env.ts              # Environment variable validation
│   └── database.ts         # Prisma client initialization
├── controllers/
│   └── auth.controller.ts  # Authentication business logic
├── middleware/
│   └── auth.ts             # JWT authentication middleware
├── routes/
│   ├── auth.routes.ts      # Auth endpoint definitions
│   └── index.ts            # Route aggregation
├── types/
│   └── auth.ts             # TypeScript type definitions
├── utils/
│   ├── jwt.ts              # JWT token generation/validation
│   ├── password.ts         # Password hashing utilities
│   └── validation.ts       # Zod validation schemas
└── server.ts               # Express application entry point
```

## Database Schema Changes

### User Model Updates

Added the following fields to the `User` model in `prisma/schema.prisma`:

```prisma
model User {
  id       Int      @id @default(autoincrement())
  email    String   @unique          // NEW: Unique email for authentication
  password String                    // NEW: Hashed password
  name     String
  role     UserRole @default(CUSTOMER)
  phone    String?
  city     String?
  photo    String?
  // ... relations
}
```

### Migration

Created migration `20251215130122_add_auth_fields` that:
- Adds `email` column (TEXT, NOT NULL, UNIQUE)
- Adds `password` column (TEXT, NOT NULL)
- Creates unique index on `email` column

## Authentication Flow

### 1. User Signup

**Endpoint:** `POST /api/auth/signup`

**Flow:**
1. Validate input data (email, password, name, phone, city)
2. Check if user with email already exists
3. Hash password using bcrypt (10 salt rounds)
4. Create user record with role='CUSTOMER'
5. Generate JWT token pair (access + refresh)
6. Return user data and tokens

**Security Measures:**
- Email uniqueness enforced at database level
- Password hashed before storage (never stored in plaintext)
- Minimum password length of 6 characters
- Input validation with Zod

### 2. User Login

**Endpoint:** `POST /api/auth/login`

**Flow:**
1. Validate input (email, password)
2. Find user by email
3. Compare provided password with stored hash
4. Generate new JWT token pair
5. Return user data and tokens

**Security Measures:**
- Generic "Invalid credentials" error (doesn't reveal if email exists)
- Constant-time password comparison via bcrypt
- Rate limiting recommended for production

### 3. Token Refresh

**Endpoint:** `POST /api/auth/refresh`

**Flow:**
1. Receive refresh token from client
2. Verify refresh token signature and expiry
3. Extract user ID from token payload
4. Verify user still exists
5. Generate new token pair
6. Return new tokens

**Security Measures:**
- Refresh token verification before generating new tokens
- User existence check prevents deleted users from refreshing
- Short-lived access tokens (15 minutes default)

### 4. Logout

**Endpoint:** `POST /api/auth/logout`

**Flow:**
1. Verify access token (via middleware)
2. Return success response

**Note:** Token invalidation is handled client-side by discarding tokens. For production, consider implementing:
- Token blacklist in Redis
- Token versioning in user records
- Short token expiry times

### 5. Get Current User

**Endpoint:** `GET /api/auth/me`

**Flow:**
1. Verify access token (via middleware)
2. Extract user ID from token payload
3. Fetch user from database
4. Return user data (excluding password)

## JWT Implementation

### Token Structure

**Payload:**
```typescript
{
  userId: number;
  email: string;
  role: UserRole;
  iat: number;      // issued at
  exp: number;      // expiry
}
```

### Token Types

**Access Token:**
- Short-lived (15 minutes default)
- Used for API authentication
- Sent in Authorization header: `Bearer <token>`

**Refresh Token:**
- Long-lived (7 days default)
- Used to obtain new access tokens
- Should be stored securely on client

### Token Generation

```typescript
export const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_TOKEN_EXPIRY as string,
  } as SignOptions);
};
```

### Token Verification

```typescript
export const verifyToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  return decoded;
};
```

## Middleware

### `authenticateToken`

Protects routes by verifying JWT access tokens.

**Usage:**
```typescript
router.get('/protected', authenticateToken, (req: AuthRequest, res) => {
  const userId = req.user.userId;  // User info from token
  const userRole = req.user.role;
  // ... handle request
});
```

**Behavior:**
- Extracts token from `Authorization: Bearer <token>` header
- Verifies token signature and expiry
- Attaches decoded user info to `req.user`
- Returns 401 if token missing/invalid/expired

### `optionalAuth`

Similar to `authenticateToken` but doesn't reject requests without tokens.

**Usage:** For endpoints that can work with or without authentication (e.g., public content that shows extra features for authenticated users).

## Password Security

### Hashing

- **Algorithm:** bcrypt
- **Salt Rounds:** 10
- **Hash Length:** 60 characters

```typescript
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};
```

### Verification

```typescript
export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};
```

## Input Validation

Using Zod for runtime type validation:

### Signup Schema
```typescript
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  city: z.string().optional(),
});
```

### Login Schema
```typescript
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
```

## Environment Variables

### Required Variables

```env
DATABASE_URL              # PostgreSQL connection string
JWT_SECRET               # Secret key for signing JWT tokens
JWT_ACCESS_TOKEN_EXPIRY  # Access token expiry (e.g., "15m", "1h")
JWT_REFRESH_TOKEN_EXPIRY # Refresh token expiry (e.g., "7d", "30d")
PORT                     # Server port (default: 3000)
NODE_ENV                 # Environment (development/production/test)
```

### Validation

Environment variables are validated at startup using Zod:

```typescript
const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_ACCESS_TOKEN_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_TOKEN_EXPIRY: z.string().default('7d'),
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});
```

If validation fails, the application exits with an error message.

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "message": "Error message",
  "errors": [            // Optional, for validation errors
    {
      "field": "email",
      "message": "Invalid email address"
    }
  ]
}
```

### HTTP Status Codes

- **200 OK:** Successful operation
- **201 Created:** User successfully created
- **400 Bad Request:** Validation error
- **401 Unauthorized:** Invalid/missing/expired token or credentials
- **404 Not Found:** User not found
- **409 Conflict:** User already exists
- **500 Internal Server Error:** Unexpected server error

## Security Best Practices

### Implemented

✅ Password hashing with bcrypt
✅ JWT token-based authentication
✅ Environment variable validation
✅ Input validation with Zod
✅ Unique constraint on email
✅ Generic error messages (don't reveal user existence)
✅ TypeScript for type safety
✅ Separate access and refresh tokens
✅ Short-lived access tokens

### Recommended for Production

- [ ] HTTPS enforcement
- [ ] Rate limiting (express-rate-limit)
- [ ] Token blacklist (Redis)
- [ ] Account lockout after failed login attempts
- [ ] Email verification on signup
- [ ] Password reset functionality
- [ ] Two-factor authentication (2FA)
- [ ] CORS configuration
- [ ] Helmet.js for security headers
- [ ] Request logging (Morgan)
- [ ] Error monitoring (Sentry)
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Load balancing
- [ ] Database connection pooling
- [ ] Stronger JWT_SECRET (use crypto.randomBytes(64).toString('hex'))
- [ ] Password strength requirements
- [ ] SQL injection protection (Prisma provides this)
- [ ] XSS protection

## Testing

### Manual Testing

Use the provided test script:
```bash
./test-auth.sh
```

### Test Scenarios Covered

1. User signup with valid data
2. Get current user with access token
3. Login with valid credentials
4. Login with invalid credentials (should fail)
5. Token refresh
6. Access protected route with new token
7. Logout
8. Access protected route without token (should fail)

### Example cURL Commands

**Signup:**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","name":"John Doe"}'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

**Protected Route:**
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Future Enhancements

### Short Term
- [ ] Password reset via email
- [ ] Email verification on signup
- [ ] Refresh token rotation
- [ ] Rate limiting middleware

### Medium Term
- [ ] OAuth integration (Google, Facebook, etc.)
- [ ] Role-based access control (RBAC) middleware
- [ ] User profile management endpoints
- [ ] Account deletion functionality

### Long Term
- [ ] Two-factor authentication
- [ ] Session management
- [ ] Audit logging
- [ ] Admin dashboard for user management

## Troubleshooting

### Common Issues

**"Can't reach database server"**
- Ensure PostgreSQL is running: `docker compose up -d`
- Check DATABASE_URL in .env

**"Invalid or expired token"**
- Token may have expired (15 min default for access tokens)
- Use refresh token to get new access token
- Check JWT_SECRET matches between token generation and verification

**"User with this email already exists"**
- Email is already registered
- Use login instead, or try different email

**TypeScript compilation errors**
- Run `npm install` to ensure all dependencies are installed
- Check TypeScript version compatibility

**Port already in use**
- Another process is using port 3000
- Change PORT in .env or kill the other process

## Maintenance

### Rotating JWT_SECRET

If JWT_SECRET needs to be rotated:
1. All existing tokens will become invalid
2. Users will need to login again
3. Consider implementing key versioning for zero-downtime rotation

### Database Migrations

When modifying user authentication schema:
1. Create migration: `npm run db:migrate:dev -- --name migration_name`
2. Test migration on staging
3. Apply to production: `npm run db:migrate`
4. Update TypeScript types if needed

## Support

For questions or issues:
- Check this documentation
- Review [API.md](API.md) for endpoint details
- Review [README.md](README.md) for setup instructions
- Check server logs for error messages
