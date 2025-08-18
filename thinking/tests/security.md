# Security Tests

- T-SEC-001 CORS preflight
  - Steps: `curl -i -X OPTIONS http://localhost:3001/api/retrieve -H 'Origin: http://localhost:3100' -H 'Access-Control-Request-Method: POST'`
  - Expect: appropriate CORS headers present

- T-SEC-002 Tenant header (future policy)
  - Steps: configure middleware to require `X-Tenant-ID`; call without header
  - Expect: 400/401

- T-SEC-003 Error response shape
  - Steps: trigger validation error; inspect JSON
  - Expect: matches `ErrorResponse` shape with `error_code`, `message`, `timestamp`, `request_id`
