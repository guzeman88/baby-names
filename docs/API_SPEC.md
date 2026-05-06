# API Specification
## BabyName — Cross-Platform Baby Name Discovery App

**Document Version:** 1.0  
**Status:** Draft  
**Owner:** Engineering Lead

---

## 1. General Conventions

### Base URL
```
Production:   https://api.babyname.app/v1
Development:  http://localhost:3001/v1
```

### Authentication
All endpoints marked `[AUTH]` require a valid JWT access token in the `Authorization` header:
```
Authorization: Bearer <access_token>
```

Access tokens expire after 15 minutes. Use the `/auth/refresh` endpoint to obtain a new one.

### Content Type
All request and response bodies use `application/json`.

### Pagination
List endpoints that can return large result sets use cursor-based pagination:
```json
{
  "data": [...],
  "nextCursor": "eyJpZCI6MjAwfQ==",
  "hasMore": true
}
```
Pass `?cursor=<value>` to fetch the next page. `nextCursor` is `null` when there are no more pages.

### Error Format
All error responses follow this format:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": { }  // optional, field-specific errors
  }
}
```

### Standard Error Codes

| HTTP Status | Error Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body/query params failed schema validation |
| 401 | `UNAUTHORIZED` | Missing or invalid/expired access token |
| 403 | `FORBIDDEN` | Token valid but insufficient permissions |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Resource already exists (e.g., email taken) |
| 422 | `UNPROCESSABLE` | Semantically invalid request |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server-side error |

### Rate Limiting
- Default: 100 requests/minute per IP
- Auth endpoints: 10 requests/minute per IP
- Rate limit headers returned: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## 2. Authentication Endpoints

### POST /auth/register

Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass1"
}
```

**Validation:**
- `email`: valid email format, max 254 chars, must not already exist
- `password`: min 8 chars, must contain at least 1 uppercase letter and 1 number

**Response `201 Created`:**
```json
{
  "user": {
    "id": "clx123abc",
    "email": "user@example.com",
    "emailVerified": false,
    "createdAt": "2024-01-15T10:00:00Z"
  },
  "accessToken": "<jwt>",
  "message": "Verification email sent to user@example.com"
}
```
*Note: Refresh token is set as an HTTP-only cookie (`Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh`).*

**Response `409 Conflict`:**
```json
{ "error": { "code": "CONFLICT", "message": "An account with this email already exists." } }
```

---

### POST /auth/login

Authenticate and receive tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass1"
}
```

**Response `200 OK`:**
```json
{
  "user": {
    "id": "clx123abc",
    "email": "user@example.com",
    "emailVerified": true,
    "lastName": "Johnson",
    "genderPref": "BOTH"
  },
  "accessToken": "<jwt>"
}
```

**Response `401 Unauthorized`:**
```json
{ "error": { "code": "UNAUTHORIZED", "message": "Invalid email or password." } }
```
*Identical message for wrong email and wrong password — prevents user enumeration.*

---

### POST /auth/refresh

Exchange a valid refresh token for a new access token.

**Auth:** Refresh token must be present in the `refresh_token` HTTP-only cookie (web) or in the request body (native).

**Request (native only):**
```json
{
  "refreshToken": "<refresh_token_value>"
}
```

**Response `200 OK`:**
```json
{
  "accessToken": "<new_jwt>"
}
```

**Response `401 Unauthorized`:** Token expired, revoked, or not found.

---

### POST /auth/logout `[AUTH]`

Revoke the current refresh token.

**Request:** Empty body. Reads refresh token from cookie (web) or:
```json
{ "refreshToken": "<value>" }
```

**Response `204 No Content`**

---

### POST /auth/verify-email

Verify a user's email address.

**Request:**
```json
{ "token": "<verification_token_from_email>" }
```

**Response `200 OK`:**
```json
{ "message": "Email verified successfully." }
```

---

### POST /auth/forgot-password

Initiate password reset flow.

**Request:**
```json
{ "email": "user@example.com" }
```

**Response `200 OK`:**
```json
{ "message": "If that email exists, a reset link has been sent." }
```
*Always returns 200 to prevent email enumeration.*

---

### POST /auth/reset-password

Complete the password reset.

**Request:**
```json
{
  "token": "<reset_token_from_email>",
  "newPassword": "NewSecurePass1"
}
```

**Response `200 OK`:**
```json
{ "message": "Password updated successfully." }
```

---

## 3. Name Endpoints

### GET /names

Fetch all names (paginated). Used to populate Browse and Swipe screens.

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `gender` | `M` \| `F` \| `both` | `both` | Filter by gender |
| `limit` | integer (1–1000) | `500` | Number of names per page |
| `cursor` | string | — | Pagination cursor from previous response |
| `sort` | `alpha` \| `rank` | `alpha` | Sort order |

**Notes:**
- For Browse screen: fetch with `sort=alpha&limit=1000` (repeat with cursor for subsequent pages).
- In practice the client fetches the full list for one gender in ~2–3 requests and caches it.
- For Swipe: client uses the same cached data, shuffled locally.

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": 42,
      "name": "Abigail",
      "gender": "F",
      "popularityRank": 8,
      "popularityPercentile": 94.2,
      "totalBirths": 4218034,
      "recentBirths": 89421,
      "peakRank": 1,
      "peakYear": 1947,
      "firstYear": 1900,
      "lastYear": 2023
    },
    ...
  ],
  "nextCursor": "eyJpZCI6NTAwfQ==",
  "hasMore": true,
  "totalCount": 72814
}
```

---

### GET /names/:nameId

Fetch detailed information for a single name, including yearly trend data.

**Path Parameters:**
- `nameId` — integer ID of the name

**Response `200 OK`:**
```json
{
  "id": 42,
  "name": "Abigail",
  "gender": "F",
  "popularityRank": 8,
  "popularityPercentile": 94.2,
  "totalBirths": 4218034,
  "recentBirths": 89421,
  "peakRank": 1,
  "peakYear": 1947,
  "firstYear": 1900,
  "lastYear": 2023,
  "yearlyStats": [
    { "year": 1900, "births": 4821, "rankThatYear": 12 },
    { "year": 1901, "births": 5012, "rankThatYear": 10 },
    ...
    { "year": 2023, "births": 14821, "rankThatYear": 8 }
  ]
}
```

*Note: `yearlyStats` contains only years with ≥5 births (SSA minimum). Years with no SSA record are omitted (not returned as nulls).*

---

### GET /names/distribution

Fetch pre-computed histogram data for the distribution curve visualization.

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `gender` | `M` \| `F` \| `both` | `both` | Distribution for gender |

**Response `200 OK`:**
```json
{
  "gender": "F",
  "totalNames": 72814,
  "buckets": [14823, 13412, 9821, 7234, 5912, 4211, 3022, 2112, 1544, 1198, ...],
  "referenceWindow": { "startYear": 2014, "endYear": 2023 }
}
```

- `buckets`: Array of exactly 100 integers. `buckets[0]` = count of names in the 0th–1st percentile (least popular), `buckets[99]` = count of names in the 99th–100th percentile (most popular).
- This endpoint is cached in Redis for 24 hours.

---

## 4. Swipe Endpoints

### GET /swipes/history `[AUTH]`

Fetch the user's swipe history (which names they've already decided on).

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `decision` | `LIKED` \| `PASSED` | — | Filter by decision type |

**Response `200 OK`:**
```json
{
  "swipedNameIds": [42, 871, 1204, 3821, ...],
  "decisions": {
    "42": "LIKED",
    "871": "PASSED",
    "1204": "LIKED",
    "3821": "PASSED"
  }
}
```

*Returns only name IDs (not full name objects) to keep payload small. The client already has all name data cached.*

---

### POST /swipes `[AUTH]`

Record a swipe decision.

**Request:**
```json
{
  "nameId": 42,
  "decision": "LIKED"
}
```

**Behavior:**
- If the user has previously swiped on this name (from a prior session), the existing record is updated to the new decision (`UPSERT`).
- The name is automatically added to the corresponding system list (`LIKED` or `PASSED`).
- If adding to `LIKED` and the name was previously in `PASSED` list (or vice versa), it is moved.

**Response `201 Created`:**
```json
{
  "swipe": {
    "nameId": 42,
    "decision": "LIKED",
    "swipedAt": "2024-01-15T10:05:00Z"
  }
}
```

---

### POST /swipes/batch `[AUTH]`

Record multiple swipe decisions at once. Used for syncing offline-queued decisions.

**Request:**
```json
{
  "swipes": [
    { "nameId": 42, "decision": "LIKED", "swipedAt": "2024-01-15T09:58:00Z" },
    { "nameId": 871, "decision": "PASSED", "swipedAt": "2024-01-15T09:59:00Z" }
  ]
}
```

**Validation:** Max 500 swipes per batch request.

**Response `200 OK`:**
```json
{
  "processed": 2,
  "errors": []
}
```

---

### DELETE /swipes/:nameId `[AUTH]`

Remove a swipe decision (used by the "Reset" feature or undo across sessions).

**Response `204 No Content`**

---

### DELETE /swipes `[AUTH]`

Reset all swipe history for the user.

**Request:**
```json
{ "confirm": true }
```

*Requires explicit `confirm: true` to prevent accidental data loss.*

**Response `204 No Content`**

---

## 5. List Endpoints

### GET /lists `[AUTH]`

Fetch all lists for the authenticated user (summary view, no entries).

**Response `200 OK`:**
```json
{
  "lists": [
    {
      "id": "list_abc123",
      "name": "Liked",
      "type": "LIKED",
      "entryCount": 43,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    },
    {
      "id": "list_def456",
      "name": "Passed",
      "type": "PASSED",
      "entryCount": 128,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T10:05:00Z"
    },
    {
      "id": "list_ghi789",
      "name": "Top Contenders",
      "type": "CUSTOM",
      "entryCount": 8,
      "createdAt": "2024-01-10T14:30:00Z",
      "updatedAt": "2024-01-14T09:20:00Z"
    }
  ]
}
```

---

### POST /lists `[AUTH]`

Create a new custom list.

**Request:**
```json
{ "name": "Middle Name Ideas" }
```

**Validation:** `name` max 128 chars, must not be empty.

**Response `201 Created`:**
```json
{
  "list": {
    "id": "list_new123",
    "name": "Middle Name Ideas",
    "type": "CUSTOM",
    "entryCount": 0,
    "createdAt": "2024-01-15T10:10:00Z",
    "updatedAt": "2024-01-15T10:10:00Z"
  }
}
```

---

### GET /lists/:listId `[AUTH]`

Fetch a list with all its entries (full name objects included).

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `sort` | `position` \| `alpha` \| `added_at` | `position` | Sort order |
| `cursor` | string | — | Pagination cursor |
| `limit` | integer | `100` | Entries per page |

**Response `200 OK`:**
```json
{
  "list": {
    "id": "list_abc123",
    "name": "Liked",
    "type": "LIKED",
    "entryCount": 43
  },
  "entries": [
    {
      "entryId": "entry_xyz",
      "position": 1000,
      "addedAt": "2024-01-10T08:00:00Z",
      "name": {
        "id": 42,
        "name": "Abigail",
        "gender": "F",
        "popularityRank": 8,
        "popularityPercentile": 94.2,
        "peakRank": 1,
        "peakYear": 1947
      }
    }
  ],
  "nextCursor": null,
  "hasMore": false
}
```

---

### PATCH /lists/:listId `[AUTH]`

Update a custom list's name. (Cannot rename system lists `LIKED`/`PASSED`.)

**Request:**
```json
{ "name": "Updated List Name" }
```

**Response `200 OK`:** Updated list object.

---

### DELETE /lists/:listId `[AUTH]`

Delete a custom list. (Cannot delete system lists `LIKED`/`PASSED`.)

**Response `204 No Content`**

---

### POST /lists/:listId/entries `[AUTH]`

Add a name to a list.

**Request:**
```json
{ "nameId": 42 }
```

**Behavior:** If the name is already in the list, returns `200 OK` (idempotent, no error).

**Response `201 Created`:**
```json
{
  "entry": {
    "entryId": "entry_xyz",
    "nameId": 42,
    "position": 5000,
    "addedAt": "2024-01-15T10:15:00Z"
  }
}
```

---

### DELETE /lists/:listId/entries/:nameId `[AUTH]`

Remove a name from a list.

**Response `204 No Content`**

---

### PATCH /lists/:listId/entries/reorder `[AUTH]`

Update the order of entries within a list.

**Request:**
```json
{
  "entries": [
    { "entryId": "entry_abc", "position": 1000 },
    { "entryId": "entry_def", "position": 2000 },
    { "entryId": "entry_ghi", "position": 3000 }
  ]
}
```

**Response `200 OK`:** Returns the updated entry positions.

---

## 6. User / Profile Endpoints

### GET /users/me `[AUTH]`

Fetch the authenticated user's profile.

**Response `200 OK`:**
```json
{
  "id": "clx123abc",
  "email": "user@example.com",
  "emailVerified": true,
  "lastName": "Johnson",
  "genderPref": "BOTH",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

### PATCH /users/me `[AUTH]`

Update user profile preferences.

**Request (all fields optional):**
```json
{
  "lastName": "Smith",
  "genderPref": "GIRL"
}
```

**Response `200 OK`:** Updated user object.

---

### PATCH /users/me/email `[AUTH]`

Change email address. Sends a verification email to the new address.

**Request:**
```json
{
  "newEmail": "new@example.com",
  "currentPassword": "CurrentPass1"
}
```

**Response `200 OK`:**
```json
{ "message": "Verification email sent to new@example.com" }
```

---

### PATCH /users/me/password `[AUTH]`

Change password.

**Request:**
```json
{
  "currentPassword": "OldPass1",
  "newPassword": "NewPass1"
}
```

**Response `200 OK`:**
```json
{ "message": "Password updated. All other sessions have been signed out." }
```

*On successful password change, all existing refresh tokens for the user are revoked.*

---

### DELETE /users/me `[AUTH]`

Delete the authenticated user's account and all associated data.

**Request:**
```json
{
  "password": "ConfirmMyPass1",
  "confirm": true
}
```

**Behavior:** Hard deletes the user record and all related rows (cascades via foreign key). Name data (SSA) is unaffected.

**Response `204 No Content`**

---

## 7. Guest Session Endpoints

These endpoints exist to support guest-to-account migration.

### POST /auth/register (with migration payload)

The standard registration endpoint accepts an optional `localHistory` field to migrate guest data:

**Request (extended):**
```json
{
  "email": "user@example.com",
  "password": "SecurePass1",
  "localHistory": {
    "swipes": [
      { "nameId": 42, "decision": "LIKED", "swipedAt": "2024-01-15T09:58:00Z" },
      { "nameId": 871, "decision": "PASSED", "swipedAt": "2024-01-15T09:59:00Z" }
    ]
  }
}
```

**Behavior:** After account creation, the swipe history is bulk-inserted before returning the response. Max 5000 swipes in `localHistory`.

---

## 8. Health & Metadata

### GET /health

Public health check endpoint.

**Response `200 OK`:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:00:00Z"
}
```

---

## 9. API Versioning

- The API is versioned via URL prefix (`/v1`).
- Breaking changes will be released as `/v2` without removing `/v1` until adequate client migration time has passed (minimum 6 months deprecation notice).
- Non-breaking additions (new optional fields, new endpoints) are made in-place without a version bump.
