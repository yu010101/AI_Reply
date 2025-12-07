# Google API Integration - Quick Reference Guide

This directory contains documentation for Google API commercial usage compliance.

## Documents Overview

### 1. Public Disclosure Page
**File:** `/pages/legal/google-api-disclosure.tsx`
**URL:** `https://ai-reply.example.com/legal/google-api-disclosure`
**Purpose:** Public-facing page explaining Google API usage to end users
**Language:** Japanese
**Audience:** End users, customers

**Contents:**
- Google API services used (Business Profile API, OAuth 2.0)
- Data collection and usage transparency
- User rights and controls
- Privacy and security measures
- Disclaimer about relationship with Google

**When to Update:**
- New Google APIs are integrated
- Data handling practices change
- Scope requirements change
- Google policy updates require disclosure changes

---

### 2. Internal Compliance Documentation
**File:** `/docs/GOOGLE_API_COMPLIANCE.md`
**Purpose:** Comprehensive internal guide for engineering and compliance teams
**Language:** English
**Audience:** Internal team members

**Contents:**
- Google Cloud Project setup requirements
- OAuth consent screen configuration
- API verification process step-by-step
- Compliance checklists
- Data handling and security requirements
- Ongoing maintenance requirements
- Contact information and resources

**When to Reference:**
- Setting up new Google Cloud projects
- Preparing for API verification
- Conducting compliance audits
- Responding to Google verification requests
- Onboarding new team members

---

## Quick Start Checklist

### Before Launch: Essential Steps

- [ ] **1. Review Public Disclosure Page**
  - Navigate to `/pages/legal/google-api-disclosure.tsx`
  - Customize email addresses and contact information
  - Review content for accuracy
  - Deploy to production

- [ ] **2. Configure OAuth Consent Screen**
  - Follow steps in GOOGLE_API_COMPLIANCE.md § 2.3
  - Add disclosure page URL to consent screen
  - Configure all authorized domains

- [ ] **3. Prepare for Verification**
  - Read GOOGLE_API_COMPLIANCE.md § 4 thoroughly
  - Create demo video (3-5 minutes)
  - Gather all required documentation
  - Submit verification 3 months before launch

- [ ] **4. Implement Security Measures**
  - Encrypt tokens (see Appendix D in compliance doc)
  - Set up monitoring and alerts
  - Configure RBAC
  - Enable audit logging

- [ ] **5. Legal Review**
  - Have legal counsel review disclosure page
  - Ensure privacy policy is updated
  - Verify terms of service compliance
  - Get DPAs signed with all processors

---

## Common Tasks

### Task 1: Update Scopes
When adding or removing Google API scopes:

1. Update scope list in `/lib/google-oauth.ts`
2. Update disclosure page with new data access information
3. Write scope justification (see Appendix B in compliance doc)
4. Resubmit for verification if adding sensitive/restricted scopes
5. Notify users if materially changing data access

### Task 2: Respond to Verification Request
When Google requests verification information:

1. Check email for specific questions from Google
2. Reference GOOGLE_API_COMPLIANCE.md § 4.3
3. Prepare detailed responses with screenshots
4. Submit within 48 hours
5. Document all communications

### Task 3: Annual Compliance Review
Once per year:

1. Follow checklist in GOOGLE_API_COMPLIANCE.md § 5.1
2. Update disclosure page if needed
3. Review and update demo video
4. Audit scope usage
5. Check for Google policy changes
6. Update internal documentation

### Task 4: Handle User Data Deletion Request
When user requests data deletion:

1. Verify user identity
2. Revoke Google OAuth tokens
3. Mark data for deletion (30-day grace period)
4. Send confirmation email to user
5. Log deletion request in audit log

---

## Important URLs

### Production URLs (Update Before Launch)
- Public Disclosure: `https://ai-reply.example.com/legal/google-api-disclosure`
- Privacy Policy: `https://ai-reply.example.com/legal/privacy-policy`
- Terms of Service: `https://ai-reply.example.com/legal/terms-of-service`

### Google Resources
- [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
- [API Credentials](https://console.cloud.google.com/apis/credentials)
- [Verification Status](https://console.cloud.google.com/apis/credentials/consent)
- [Quota Usage](https://console.cloud.google.com/apis/dashboard)

### Internal Resources
- Engineering Docs: `/docs/`
- Legal Pages: `/pages/legal/`
- OAuth Implementation: `/lib/google-oauth.ts`

---

## Team Contacts

### Primary Contacts
- **Engineering Lead:** engineering@ai-reply.example.com
- **Security Officer:** security@ai-reply.example.com
- **Compliance Officer:** compliance@ai-reply.example.com
- **Legal Counsel:** legal@ai-reply.example.com

### Escalation Path
1. Engineering Lead (technical issues)
2. Compliance Officer (policy/verification issues)
3. Legal Counsel (legal interpretation)

---

## FAQ

**Q: Do we need verification before launching?**
A: Yes, if you plan to have more than 100 users or use sensitive scopes. Start the process 3 months before launch.

**Q: How long does verification take?**
A: Typically 1-3 months, but can vary. Plan accordingly.

**Q: What happens if verification is denied?**
A: Google will provide specific feedback. Address their concerns and resubmit. See § 4.4 in compliance doc.

**Q: Can we use the API while waiting for verification?**
A: Yes, but only in "Testing" mode with up to 100 whitelisted test users.

**Q: How often should we update the disclosure page?**
A: Whenever there are material changes to data handling, scopes, or features. Review quarterly.

**Q: What if Google changes their API policies?**
A: Monitor announcements, assess impact, implement changes, and update documentation. See § 5.2 in compliance doc.

---

## Document Maintenance

**Last Updated:** 2025-12-07
**Next Review Date:** 2026-03-07 (Quarterly)
**Document Owner:** Engineering Team

**Change Log:**
- 2025-12-07: Initial documentation created
  - Added public disclosure page (Japanese)
  - Added comprehensive compliance guide
  - Created quick reference guide

---

## Getting Help

**For Questions About:**
- Technical implementation → Engineering Lead
- Google verification → Compliance Officer
- Legal compliance → Legal Counsel
- Security concerns → Security Officer

**External Support:**
- [Google OAuth Support](https://support.google.com/cloud/contact/oauth_verification)
- [Stack Overflow - google-business-api](https://stackoverflow.com/questions/tagged/google-business-api)

---

**Note:** Replace all `ai-reply.example.com` references with your actual domain before deployment.
