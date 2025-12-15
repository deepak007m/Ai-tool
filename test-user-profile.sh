#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000/api"

echo -e "${BLUE}========== User Profile CRUD API Test ==========${NC}\n"

# Test 1: User Signup
echo -e "${BLUE}Test 1: User Signup${NC}"
SIGNUP_RESPONSE=$(curl -s -X POST "$API_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "password123",
    "name": "Test User",
    "city": "New York"
  }')

echo "Response: $SIGNUP_RESPONSE"
USER_ID=$(echo $SIGNUP_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
ACCESS_TOKEN=$(echo $SIGNUP_RESPONSE | grep -o '"accessToken":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${RED}Error: Failed to get access token${NC}\n"
  exit 1
fi

echo -e "${GREEN}✓ Signup successful${NC}"
echo "User ID: $USER_ID"
echo "Access Token: ${ACCESS_TOKEN:0:20}...\n"

# Test 2: Get User Profile
echo -e "${BLUE}Test 2: Get User Profile${NC}"
GET_PROFILE=$(curl -s -X GET "$API_URL/users/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Response: $GET_PROFILE"

if echo $GET_PROFILE | grep -q "$USER_ID"; then
  echo -e "${GREEN}✓ Get profile successful${NC}\n"
else
  echo -e "${RED}✗ Get profile failed${NC}\n"
fi

# Test 3: Update User Profile
echo -e "${BLUE}Test 3: Update User Profile${NC}"
UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/users/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated User",
    "phone": "1234567890",
    "city": "Los Angeles"
  }')

echo "Response: $UPDATE_RESPONSE"

if echo $UPDATE_RESPONSE | grep -q "Updated User"; then
  echo -e "${GREEN}✓ Update profile successful${NC}\n"
else
  echo -e "${RED}✗ Update profile failed${NC}\n"
fi

# Test 4: Change Password
echo -e "${BLUE}Test 4: Change Password${NC}"
CHANGE_PWD=$(curl -s -X PUT "$API_URL/users/password" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "password123",
    "newPassword": "newpassword123"
  }')

echo "Response: $CHANGE_PWD"

if echo $CHANGE_PWD | grep -q "successfully"; then
  echo -e "${GREEN}✓ Change password successful${NC}\n"
else
  echo -e "${RED}✗ Change password failed${NC}\n"
fi

# Test 5: Create Admin User for role update test
echo -e "${BLUE}Test 5: Create Admin User${NC}"
ADMIN_SIGNUP=$(curl -s -X POST "$API_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "adminpass123",
    "name": "Admin User"
  }')

ADMIN_TOKEN=$(echo $ADMIN_SIGNUP | grep -o '"accessToken":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Admin Token: ${ADMIN_TOKEN:0:20}...\n"

# Test 6: Try to update role without admin privilege (should fail)
echo -e "${BLUE}Test 6: Try to Update User Role Without Admin Privilege (should fail)${NC}"
ROLE_UPDATE_NO_ADMIN=$(curl -s -X PUT "$API_URL/users/role" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": $USER_ID,
    \"role\": \"VENDOR\"
  }")

echo "Response: $ROLE_UPDATE_NO_ADMIN"

if echo $ROLE_UPDATE_NO_ADMIN | grep -q "Admin role required\|Access denied"; then
  echo -e "${GREEN}✓ Correctly denied access to non-admin user${NC}\n"
else
  echo -e "${RED}✗ Should have denied access${NC}\n"
fi

# Test 7: Manually update admin role in database and test role update
echo -e "${BLUE}Test 7: Attempt to Get All Users Without Admin Privilege (should fail)${NC}"
GET_ALL_USERS=$(curl -s -X GET "$API_URL/users/all" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Response: $GET_ALL_USERS"

if echo $GET_ALL_USERS | grep -q "Admin role required\|Access denied"; then
  echo -e "${GREEN}✓ Correctly denied access to non-admin user${NC}\n"
else
  echo -e "${RED}✗ Should have denied access${NC}\n"
fi

echo -e "${BLUE}========== Tests Complete ==========${NC}"
