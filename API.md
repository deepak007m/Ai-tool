# BookMyEvent Authentication API

## Overview

This document describes the authentication endpoints available in the BookMyEvent API.

## Base URL

```
http://localhost:3000/api
```

## Authentication Endpoints

### 1. Sign Up

Create a new user account.

**Endpoint:** `POST /auth/signup`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "phone": "+1234567890",
  "city": "New York"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "role": "CUSTOMER",
      "phone": "+1234567890",
      "city": "New York"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - Validation error
- `409 Conflict` - User with this email already exists

---

### 2. Login

Authenticate a user and receive JWT tokens.

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "role": "CUSTOMER",
      "phone": "+1234567890",
      "city": "New York"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Invalid credentials

---

### 3. Refresh Token

Get new access and refresh tokens using a valid refresh token.

**Endpoint:** `POST /auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - Refresh token is required
- `401 Unauthorized` - Invalid or expired refresh token

---

### 4. Logout

Logout the current user (token invalidation is handled client-side).

**Endpoint:** `POST /auth/logout`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid token

---

### 5. Get Current User

Get the current authenticated user's information.

**Endpoint:** `GET /auth/me`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "role": "CUSTOMER",
      "phone": "+1234567890",
      "city": "New York",
      "photo": null
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - User not found

---

## JWT Token Structure

JWT tokens contain the following payload:

```json
{
  "userId": 1,
  "email": "user@example.com",
  "role": "CUSTOMER",
  "iat": 1234567890,
  "exp": 1234567890
}
```

## Token Expiration

- **Access Token:** 15 minutes (configurable via `JWT_ACCESS_TOKEN_EXPIRY`)
- **Refresh Token:** 7 days (configurable via `JWT_REFRESH_TOKEN_EXPIRY`)

## Using Protected Routes

To access protected routes, include the JWT access token in the Authorization header:

```
Authorization: Bearer <your_access_token>
```

## Security Notes

1. Passwords are hashed using bcrypt with 10 salt rounds
2. JWT tokens are signed with a secret key (set via `JWT_SECRET` environment variable)
3. Always use HTTPS in production
4. Store tokens securely on the client side
5. The logout endpoint doesn't invalidate tokens server-side; handle token deletion on the client
6. Implement token blacklisting for production use cases if needed
