# VULNRΞPO API Reference

If you want to build your own backend system for VULNRΞPO you are in the right place! You choose the technology in which you will manage and store the reports. VULNRΞPO has a simple integration with the backend api, the requests described below.

## API Reference

#### Init request: apiconnect

Request:
```http
POST /api/ HTTP/2
Vulnrepo-Auth: [API-ACCESS-KEY]
Vulnrepo-Action: apiconnect

```

Response:
```http
HTTP/2 200 OK
Content-Type: application/json
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: vulnrepo-auth, vulnrepo-action

{"AUTH": "OK", "WELCOME": "John Doe", "CREATEDATE": "2021-05-14", "EXPIRYDATE": "2025-03-18", "CURRENT_STORAGE": "1000000", "MAX_STORAGE": "10000000"}

```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `API-ACCESS-KEY` | `string` | **Required**. Your API key |
| `WELCOME` | `string` | User name |
| `CREATEDATE` | `string` | Create account date |
| `EXPIRYDATE` | `string` | Access validity period |
| `CURRENT_STORAGE` | `string` | Current storage used (in bytes) on API |
| `MAX_STORAGE` | `string` | Max storage available (in bytes) on API |

#### getreportslist: Get all reports items

Request:
```http
POST /api/ HTTP/2
Vulnrepo-Auth: [API-ACCESS-KEY]
Vulnrepo-Action: getreportslist
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
```

Response:
```http
HTTP/2 200 OK
Content-Type: application/json
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: vulnrepo-auth, vulnrepo-action

[{"report_id":"[report_id]","report_name":"Test Report","report_createdate":1606571788759,"report_lastupdate":1608657635687,"encrypted_data":"U2FsdGVkX1\/N5+L8lTFgApttAb+SI...[trunked]"}]

```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `API-ACCESS-KEY` | `string` | **Required**. Your API key |

#### getreport

Request:
```http
POST /api/ HTTP/2
Vulnrepo-Auth: [API-ACCESS-KEY]
Vulnrepo-Action: getreport
Content-Type: application/x-www-form-urlencoded; charset=UTF-8

reportid=[report_id]

```

Response:
```http
HTTP/2 200 OK
Content-Type: application/json
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: vulnrepo-auth, vulnrepo-action

[{"report_id":"[report_id]","report_name":"Test report 21","report_createdate":1616859952914,"report_lastupdate":"","encrypted_data":"U2FsdGVkX1+t8fhgoP...[trunked]"}]
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `API-ACCESS-KEY` | `string` | **Required**. Your API key |
| `report_id` | `string` | **Required**. Report ID to remove |

#### removereport

Request:
```http
POST /api/ HTTP/2
Vulnrepo-Auth: [API-ACCESS-KEY]
Vulnrepo-Action: removereport
Content-Type: application/x-www-form-urlencoded; charset=UTF-8

reportid=[report_id]

```

Response:
```http
HTTP/2 200 OK
Content-Type: application/json
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: vulnrepo-auth, vulnrepo-action

{"REMOVE_REPORT": "OK"}
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `API-ACCESS-KEY` | `string` | **Required**. Your API key |
| `report_id` | `string` | **Required**. Report ID to remove |

#### savereport

Request:
```http
POST /api/ HTTP/2
Vulnrepo-Auth: [API-ACCESS-KEY]
Vulnrepo-Action: savereport
Content-Type: application/x-www-form-urlencoded; charset=UTF-8

reportdata=[base64_encode(report)]

```

Response:
```http
HTTP/2 200 OK
Content-Type: application/json
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: vulnrepo-auth, vulnrepo-action

{"REPORT_SAVED": "OK"}
```

ERROR response:

No space on API:
```http
{"STORAGE": "NOSPACE"}
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `API-ACCESS-KEY` | `string` | **Required**. Your API key |
| `reportdata` | `string` | **Required**. Report data encrypted base64 |

#### updatereport

Request:
```http
POST /api/ HTTP/2
Vulnrepo-Auth: [API-ACCESS-KEY]
Vulnrepo-Action: updatereport
Content-Type: application/x-www-form-urlencoded; charset=UTF-8

reportdata=[base64_encode(report)]
```

Response:
```http
HTTP/2 200 OK
Content-Type: application/json
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: vulnrepo-auth, vulnrepo-action

{"REPORT_UPDATE": "OK"}
```

ERROR response:

No space on API:
```http
{"STORAGE": "NOSPACE"}
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `API-ACCESS-KEY` | `string` | **Required**. Your API key |
| `reportdata` | `string` | **Required**. Report data encrypted base64 |
