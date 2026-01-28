# Security Policy

## Known Security Exceptions

This document outlines accepted security vulnerabilities and the rationale for accepting them in this internal administrative tool.

### xlsx - High Severity

**Vulnerabilities:**

- Prototype Pollution in SheetJS ([GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6))
- SheetJS Regular Expression Denial of Service (ReDoS) ([GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9))

**Status:** No fix available

**Mitigation Measures:**

- **Internal Use Only**: This is an administrative tool, not a public-facing service
- **CDP Uploader Integration**: All uploaded files undergo virus scanning via the CDP Uploader service before processing
- **Access Control**: Restricted to trusted administrators with appropriate permissions
- **File Validation**: Excel files are validated against expected schema before import
- **CDP Environment**: Application runs in isolated CDP environment with network security controls
- **Audit Trail**: All uploads and imports are logged for security monitoring

**Risk Assessment:** The risk is **accepted** as the security controls in place (virus scanning, access restriction, validation) adequately mitigate the vulnerabilities for an internal administrative tool.

**Alternative Considered:** Switching to alternative Excel parsing libraries would require significant code refactoring. Given the mitigation measures in place, this is not justified for an internal tool.

---

### @babel/runtime - Moderate Severity

**Vulnerability:**

- Babel has inefficient RegExp complexity in generated code with .replace when transpiling named capturing groups ([GHSA-968p-4wvh-cqc8](https://github.com/advisories/GHSA-968p-4wvh-cqc8))

**Status:** Fix available (v7.26.10+) but requires breaking dependency range

**Impact:**

- Build tooling dependency, not directly exposed to user input
- Affects transpiled code generation, not runtime execution paths
- Low likelihood of exploitation in controlled CDP environment

**Risk Assessment:** **Accepted** for current deployment. The vulnerability impact is limited to build-time code generation. Will be addressed in next major dependency update cycle.

---

### undici - Moderate Severity

**Vulnerability:**

- Undici has an unbounded decompression chain in HTTP responses on Node.js Fetch API via Content-Encoding leads to resource exhaustion ([GHSA-g9mf-h72j-4rw9](https://github.com/advisories/GHSA-g9mf-h72j-4rw9))

**Status:** Fix available (v7.18.2+) but requires breaking dependency range

**Impact:**

- HTTP client library vulnerability
- Could lead to resource exhaustion through malicious HTTP responses
- Application uses controlled endpoints (CDP Uploader, MongoDB, S3)

**Mitigation Measures:**

- Application only communicates with trusted internal services (CDP Uploader, AWS S3)
- Runs in CDP environment with network egress controls
- No direct user-controlled HTTP request destinations

**Risk Assessment:** **Accepted** for current deployment. The application does not make HTTP requests to untrusted or user-controlled destinations. Will be addressed in next major dependency update cycle.

---

## Security Review Schedule

These exceptions should be reviewed:

- When dependency updates become available that don't break compatibility
- During major version upgrades
- If the tool's usage pattern changes (e.g., becomes public-facing)
- Quarterly security review cycles

## Reporting Security Issues

If you discover a security vulnerability in this project, please report it to the DEFRA security team following the standard incident response procedures.

---

**Last Updated:** 28 January 2026  
**Reviewed By:** Development Team  
**Next Review:** Q2 2026
