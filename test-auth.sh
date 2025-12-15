#!/bin/bash

# BookMyEvent Authentication API Test Script

API_URL="http://localhost:3000/api"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== BookMyEvent Authentication API Test ===${NC}\n"

# Test 1: Sign Up
echo -e "${GREEN}1. Testing Sign Up${NC}"
SIGNUP_RESPONSE=$(curl -s -X POST "$API_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User",
    "phone": "+1234567890",
    "city": "New York"
  }')

echo "$SIGNUP_RESPONSE" | jq '.'
ACCESS_TOKEN=$(echo "$SIGNUP_RESPONSE" | jq -r '.data.tokens.accessToken')
REFRESH_TOKEN=$(echo "$SIGNUP_RESPONSE" | jq -r '.data.tokens.refreshToken')
echo -e "\nAccess Token: ${ACCESS_TOKEN:0:50}..."
echo -e "Refresh Token: ${REFRESH_TOKEN:0:50}...\n"

# Test 2: Get Current User
echo -e "${GREEN}2. Testing Get Current User (with access token)${NC}"
curl -s -X GET "$API_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
echo ""

# Test 3: Login
echo -e "${GREEN}3. Testing Login${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

echo "$LOGIN_RESPONSE" | jq '.'
echo ""

# Test 4: Login with Invalid Credentials
echo -e "${GREEN}4. Testing Login with Invalid Credentials${NC}"
curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "wrongpassword"
  }' | jq '.'
echo ""

# Test 5: Refresh Token
echo -e "${GREEN}5. Testing Token Refresh${NC}"
REFRESH_RESPONSE=$(curl -s -X POST "$API_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }")

echo "$REFRESH_RESPONSE" | jq '.'
NEW_ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE" | jq -r '.data.tokens.accessToken')
echo -e "\nNew Access Token: ${NEW_ACCESS_TOKEN:0:50}...\n"

# Test 6: Access Protected Route with New Token
echo -e "${GREEN}6. Testing Protected Route with New Token${NC}"
curl -s -X GET "$API_URL/auth/me" \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN" | jq '.'
echo ""

# Test 7: Logout
echo -e "${GREEN}7. Testing Logout${NC}"
curl -s -X POST "$API_URL/auth/logout" \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN" | jq '.'
echo ""

# Test 8: Access Protected Route without Token
echo -e "${GREEN}8. Testing Protected Route without Token${NC}"
curl -s -X GET "$API_URL/auth/me" | jq '.'
echo ""

echo -e "${YELLOW}=== Tests Complete ===${NC}"
