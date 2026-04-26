# VULNRΞPO API Integration Reference

This document describes the HTTP API that VULNRΞPO uses to communicate with an optional backend storage server. Implementing this API lets you store encrypted reports on your own infrastructure instead of (or in addition to) browser-local IndexedDB.

**All report data sent to and from the API is AES-256-GCM encrypted ciphertext.** Plaintext report content never leaves the browser.

## Example Server

An example server implementation is available at:
[https://github.com/kac89/vulnrepo-server](https://github.com/kac89/vulnrepo-server)

> **Note:** The example server is intended for personal or small-team use. Review and harden it before using in a production environment.

---

## Authentication

All requests must include two custom HTTP headers:

| Header | Description |
|---|---|
| `Vulnrepo-Auth` | Your API access key |
| `Vulnrepo-Action` | The action to perform (see endpoints below) |

Your server must also return the following CORS headers to allow requests from browser-hosted instances:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: vulnrepo-auth, vulnrepo-action
```

---

## Endpoints

All requests use `POST /api/`.

### `apiconnect` — Verify API key and retrieve account info

**Request:**

```http
POST /api/ HTTP/2
Vulnrepo-Auth: <API-ACCESS-KEY>
Vulnrepo-Action: apiconnect
```

**Response:**

```json
{
  "AUTH": "OK",
  "WELCOME": "John Doe",
  "CREATEDATE": "2021-05-14",
  "EXPIRYDATE": "2025-03-18",
  "CURRENT_STORAGE": "1000000",
  "MAX_STORAGE": "10000000"
}
```

| Field | Type | Description |
|---|---|---|
| `AUTH` | `string` | `"OK"` on success |
| `WELCOME` | `string` | Display name for the account |
| `CREATEDATE` | `string` | Account creation date (`YYYY-MM-DD`) |
| `EXPIRYDATE` | `string` | Access expiry date (`YYYY-MM-DD`); optional |
| `CURRENT_STORAGE` | `string` | Bytes currently used on the server |
| `MAX_STORAGE` | `string` | Maximum storage quota in bytes |

---

### `getreportslist` — List all reports

**Request:**

```http
POST /api/ HTTP/2
Vulnrepo-Auth: <API-ACCESS-KEY>
Vulnrepo-Action: getreportslist
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
```

**Response:**

```json
[
  {
    "report_id": "<report_id>",
    "report_name": "Test Report",
    "report_createdate": 1606571788759,
    "report_lastupdate": 1608657635687
  }
]
```

| Field | Type | Description |
|---|---|---|
| `report_id` | `string` | Unique report identifier (UUID) |
| `report_name` | `string` | Human-readable report name |
| `report_createdate` | `number` | Unix timestamp (ms) of creation |
| `report_lastupdate` | `number` | Unix timestamp (ms) of last update |

---

### `getreport` — Retrieve a single report

**Request:**

```http
POST /api/ HTTP/2
Vulnrepo-Auth: <API-ACCESS-KEY>
Vulnrepo-Action: getreport
Content-Type: application/x-www-form-urlencoded; charset=UTF-8

reportid=<report_id>
```

**Request body parameters:**

| Parameter | Type | Description |
|---|---|---|
| `reportid` | `string` | **Required.** The ID of the report to retrieve |

**Response:**

```json
[
  {
    "report_id": "<report_id>",
    "report_name": "Test report",
    "report_createdate": 1616859952914,
    "report_lastupdate": "",
    "encrypted_data": "U2FsdGVkX1+t8fhgoP...[truncated]"
  }
]
```

| Field | Type | Description |
|---|---|---|
| `report_id` | `string` | Report identifier |
| `report_name` | `string` | Report name |
| `report_createdate` | `number` | Unix timestamp (ms) of creation |
| `report_lastupdate` | `number` \| `string` | Unix timestamp (ms) of last update, or `""` if never updated |
| `encrypted_data` | `string` | Base64-encoded AES-256-GCM encrypted report data |

---

### `savereport` — Save a new report

**Request:**

```http
POST /api/ HTTP/2
Vulnrepo-Auth: <API-ACCESS-KEY>
Vulnrepo-Action: savereport
Content-Type: application/x-www-form-urlencoded; charset=UTF-8

reportdata=<base64_encoded_report_json>
```

**Request body parameters:**

| Parameter | Type | Description |
|---|---|---|
| `reportdata` | `string` | **Required.** Base64-encoded JSON containing the report object (including `encrypted_data`) |

**Success response:**

```json
{"REPORT_SAVED": "OK"}
```

**Error response — no storage quota remaining:**

```json
{"STORAGE": "NOSPACE"}
```

---

### `updatereport` — Update an existing report

**Request:**

```http
POST /api/ HTTP/2
Vulnrepo-Auth: <API-ACCESS-KEY>
Vulnrepo-Action: updatereport
Content-Type: application/x-www-form-urlencoded; charset=UTF-8

reportdata=<base64_encoded_report_json>
```

**Request body parameters:**

| Parameter | Type | Description |
|---|---|---|
| `reportdata` | `string` | **Required.** Base64-encoded JSON containing the updated report object |

**Success response:**

```json
{"REPORT_UPDATE": "OK"}
```

**Error response — no storage quota remaining:**

```json
{"STORAGE": "NOSPACE"}
```

---

### `removereport` — Delete a report

**Request:**

```http
POST /api/ HTTP/2
Vulnrepo-Auth: <API-ACCESS-KEY>
Vulnrepo-Action: removereport
Content-Type: application/x-www-form-urlencoded; charset=UTF-8

reportid=<report_id>
```

**Request body parameters:**

| Parameter | Type | Description |
|---|---|---|
| `reportid` | `string` | **Required.** The ID of the report to delete |

**Response:**

```json
{"REMOVE_REPORT": "OK"}
```

---

### `getreportprofiles` — Retrieve report profiles

Report profiles store reusable configuration (logo, researcher info, theme, CSS).

**Request:**

```http
POST /api/ HTTP/2
Vulnrepo-Auth: <API-ACCESS-KEY>
Vulnrepo-Action: getreportprofiles
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
```

**Response:** JSON array of report profile objects.

---

### `getreporttemplates` — Retrieve issue templates

**Request:**

```http
POST /api/ HTTP/2
Vulnrepo-Auth: <API-ACCESS-KEY>
Vulnrepo-Action: getreporttemplates
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
```

**Response:** JSON array of issue template objects.

---

## Report Object Schema

The `reportdata` field sent in `savereport` and `updatereport` is a Base64-encoded JSON string with the following top-level structure:

```json
{
  "report_id": "<uuid>",
  "report_name": "My Assessment",
  "report_createdate": 1616859952914,
  "report_lastupdate": 1616900000000,
  "encrypted_data": "<base64-encoded AES-256-GCM ciphertext>"
}
```

The `encrypted_data` field is a versioned binary blob encoded in Base64:

- **v2 format** (current): `[0x76, 0x32] + salt(16 bytes) + iv(12 bytes) + ciphertext`
- **Legacy format**: CryptoJS-compatible AES ciphertext (automatically detected for backward compatibility)
