# Google API Verification - Pre-Launch Checklist

**Project:** AI Reply
**Target Launch Date:** _____________
**Verification Submission Deadline:** _____________ (3 months before launch)
**Assigned To:** _____________

---

## Phase 1: Prerequisites (Week 1-2)

### Google Cloud Project Setup
- [ ] Google Cloud project created with production name
- [ ] Billing enabled on the project
- [ ] Project uses corporate Google Workspace account (not personal Gmail)
- [ ] 2-factor authentication enabled on project owner account
- [ ] At least 2 team members have project ownership access
- [ ] Project ID documented: `____________________`

### Enable APIs
- [ ] Google Business Profile API enabled
- [ ] Google OAuth 2.0 configured
- [ ] API quotas reviewed and increase requested if needed
- [ ] API usage monitoring configured

### Domain Setup
- [ ] Production domain purchased and configured
- [ ] SSL/TLS certificate installed (TLS 1.2+)
- [ ] HSTS (HTTP Strict Transport Security) enabled
- [ ] Domain verified in Google Search Console
- [ ] Verification method: [ ] HTML file [ ] Meta tag [ ] DNS record

---

## Phase 2: OAuth Consent Screen (Week 2-3)

### Basic Configuration
- [ ] User type set to "External"
- [ ] App name: `AI Reply`
- [ ] User support email: `____________________`
- [ ] Developer contact email: `____________________`

### Branding
- [ ] App logo uploaded (120x120px, PNG/JPG, no text)
- [ ] App logo meets Google brand guidelines
- [ ] Application home page URL: `https://____________________`

### Legal Pages (Must be publicly accessible)
- [ ] Privacy Policy URL: `https://____________________/legal/privacy-policy`
- [ ] Terms of Service URL: `https://____________________/legal/terms-of-service`
- [ ] Google API Disclosure URL: `https://____________________/legal/google-api-disclosure`
- [ ] All legal pages are live and accessible (no login required)
- [ ] Legal pages are in Japanese (primary market language)
- [ ] Legal pages reviewed by counsel

### Authorized Domains
- [ ] Production domain added: `____________________`
- [ ] All subdomains added if needed
- [ ] No development/localhost domains in production config

### Scopes Configuration
- [ ] Only necessary scopes requested
- [ ] Scopes list documented:
  - [ ] `https://www.googleapis.com/auth/userinfo.email`
  - [ ] `https://www.googleapis.com/auth/userinfo.profile`
  - [ ] `https://www.googleapis.com/auth/business.manage`
  - [ ] Other: `____________________`
- [ ] Justification written for each sensitive scope
- [ ] Incremental authorization implemented (request scopes when needed)

---

## Phase 3: OAuth Credentials (Week 3)

### Client ID Configuration
- [ ] OAuth 2.0 Client ID created
- [ ] Application type: Web application
- [ ] Authorized JavaScript origins configured:
  - [ ] `https://____________________`
- [ ] Authorized redirect URIs configured:
  - [ ] `https://____________________/api/auth/callback/google`
- [ ] Test redirect URIs removed from production config

### Credential Security
- [ ] Client ID documented (safe to expose publicly)
- [ ] Client Secret stored securely in environment variables
- [ ] Client Secret NOT committed to version control
- [ ] `.env.local` added to `.gitignore`
- [ ] Separate credentials for development, staging, production
- [ ] Credential rotation schedule established (quarterly)

---

## Phase 4: Documentation Preparation (Week 3-4)

### Public Disclosure Page
- [ ] File created: `/pages/legal/google-api-disclosure.tsx`
- [ ] Deployed to: `https://____________________/legal/google-api-disclosure`
- [ ] Content reviewed for accuracy
- [ ] All placeholder emails updated with real contacts
- [ ] Links to privacy policy and terms work correctly
- [ ] Page is mobile-responsive
- [ ] SEO metadata added
- [ ] Translation reviewed by native Japanese speaker

### Privacy Policy Updates
- [ ] Privacy policy includes Google API data usage section
- [ ] Lists all data types collected via Google APIs
- [ ] Explains purpose of data collection
- [ ] Describes data retention periods
- [ ] Details user rights (access, deletion, portability)
- [ ] Includes contact information for privacy requests

### Terms of Service Updates
- [ ] Terms reference Google API usage
- [ ] Disclaimer about non-affiliation with Google
- [ ] User responsibilities for Google account security
- [ ] Termination clause includes data deletion

---

## Phase 5: Demo Video Creation (Week 4-5)

### Video Planning
- [ ] Script written covering all required elements:
  - [ ] OAuth consent flow
  - [ ] Data access demonstration
  - [ ] Data usage in application
  - [ ] User disconnection and data deletion
- [ ] Screen recording software tested
- [ ] Test account with sample data prepared
- [ ] Narration script reviewed

### Video Recording
- [ ] Video recorded in 720p or higher
- [ ] Audio is clear and professional
- [ ] Video length: 3-5 minutes
- [ ] All UI elements are visible and readable
- [ ] No sensitive data exposed in video
- [ ] Uploaded to YouTube as unlisted video
- [ ] Video URL documented: `____________________`

### Video Content Checklist
- [ ] Shows login page with "Sign in with Google" button
- [ ] Displays OAuth consent screen
- [ ] Explains each scope being requested
- [ ] Demonstrates successful connection
- [ ] Shows features using Google data (review display, reply posting)
- [ ] Navigates to settings page showing connection status
- [ ] Demonstrates disconnection process
- [ ] Shows data deletion confirmation

---

## Phase 6: Scope Justifications (Week 4-5)

### Write Justification for Each Sensitive Scope

**Scope 1: business.manage**
- [ ] Purpose explained clearly
- [ ] Feature requirements listed
- [ ] User benefits described
- [ ] Data access detailed
- [ ] Storage and encryption explained
- [ ] Alternative approaches discussed
- [ ] User control mechanisms described

**Additional Scopes (if any):**
- [ ] Scope: `____________________`
  - [ ] Justification written following template in Appendix B
  - [ ] Reviewed by compliance officer

---

## Phase 7: Security Implementation (Week 5-6)

### Data Encryption
- [ ] TLS 1.2+ for all API communications
- [ ] AES-256 encryption for data at rest
- [ ] Token encryption implemented (see Appendix D in compliance doc)
- [ ] Encryption keys stored in secure vault
- [ ] Key rotation schedule established

### Access Control
- [ ] Role-based access control (RBAC) implemented
- [ ] Principle of least privilege applied
- [ ] API access logging configured
- [ ] Audit logs retained for 2 years
- [ ] Log monitoring and alerting set up

### Token Management
- [ ] Access tokens stored encrypted
- [ ] Refresh tokens stored encrypted
- [ ] Token refresh mechanism implemented
- [ ] Token expiration handled gracefully
- [ ] Tokens revoked on user logout/disconnection
- [ ] Token revocation on account deletion

### User Controls
- [ ] Settings page shows Google connection status
- [ ] "Disconnect Google Account" button implemented
- [ ] Confirmation dialog on disconnection
- [ ] Data deletion on disconnection (30-day grace period)
- [ ] User can re-connect after disconnection
- [ ] "Delete Account" functionality includes Google data deletion

---

## Phase 8: Testing (Week 6-7)

### Functional Testing
- [ ] OAuth flow tested on all major browsers:
  - [ ] Chrome
  - [ ] Firefox
  - [ ] Safari
  - [ ] Edge
- [ ] Mobile responsiveness tested
- [ ] OAuth flow tested on mobile devices
- [ ] Token refresh tested (simulate expired token)
- [ ] Connection status display accurate
- [ ] Disconnection removes API access

### Security Testing
- [ ] Token storage verified as encrypted
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] CSRF protection implemented
- [ ] XSS protection verified
- [ ] SQL injection protection verified
- [ ] Rate limiting configured
- [ ] Security headers configured (CSP, X-Frame-Options, etc.)

### Error Handling
- [ ] User denies OAuth consent → graceful failure
- [ ] Google API error → user-friendly error message
- [ ] Token expired → automatic refresh or re-auth prompt
- [ ] Network error → retry logic with user feedback
- [ ] Invalid scope → error logged and handled

### Data Processing Agreement (DPA) Compliance
- [ ] Supabase DPA signed
- [ ] OpenAI DPA signed
- [ ] Stripe DPA signed
- [ ] All sub-processors documented
- [ ] GDPR compliance verified

---

## Phase 9: Verification Submission (Week 7-8)

### Pre-Submission Review
- [ ] All previous phases completed
- [ ] Final review of OAuth consent screen
- [ ] Final review of legal pages
- [ ] Demo video reviewed by team
- [ ] All justifications reviewed and polished
- [ ] Compliance officer sign-off received

### Submission Process
- [ ] Go to [Google Cloud Console OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
- [ ] Click "Submit for Verification"
- [ ] Fill out verification form completely
- [ ] Upload demo video URL
- [ ] Paste all scope justifications
- [ ] List all URLs (privacy, terms, disclosure)
- [ ] Describe application's core functionality
- [ ] Explain security measures
- [ ] Submit application
- [ ] Save submission confirmation
- [ ] Document submission date: `____________________`

### Post-Submission
- [ ] Confirmation email received from Google
- [ ] Ticket/case number documented: `____________________`
- [ ] Expected review timeline: 3-6 weeks
- [ ] Calendar reminder set for follow-up
- [ ] Team notified of submission

---

## Phase 10: Verification Review Process (Week 8-20)

### Monitoring
- [ ] Check verification status weekly
- [ ] Monitor email for Google requests
- [ ] Respond to Google within 24-48 hours

### If Google Requests Changes
- [ ] Review feedback carefully
- [ ] Document all requested changes
- [ ] Implement changes
- [ ] Update demo video if needed
- [ ] Update documentation
- [ ] Resubmit for review
- [ ] Document resubmission date: `____________________`

### If Verification Approved
- [ ] Celebrate!
- [ ] Verification approval date: `____________________`
- [ ] Update internal documentation
- [ ] Set publishing status to "Production"
- [ ] Remove user count limitation
- [ ] Proceed with public launch

### If Verification Denied
- [ ] Review denial reasons
- [ ] Escalate to compliance officer and legal counsel
- [ ] Create remediation plan
- [ ] Implement required changes
- [ ] Resubmit with detailed explanation

---

## Phase 11: Post-Verification (Ongoing)

### Immediate Actions
- [ ] Publishing status changed to "Production"
- [ ] Remove test user restrictions
- [ ] Monitor API usage and errors
- [ ] Monitor user OAuth success rates

### Ongoing Compliance
- [ ] Quarterly compliance review scheduled
- [ ] Annual security audit scheduled
- [ ] Policy update monitoring process established
- [ ] User data request handling process documented
- [ ] Incident response plan created

### Monitoring Setup
- [ ] API quota alerts configured (80%, 90%, 95%)
- [ ] Error rate alerts configured (>5% failure)
- [ ] Unusual access pattern alerts configured
- [ ] Security incident alerts configured

---

## Timeline Summary

| Phase | Duration | Deadline | Status |
|-------|----------|----------|--------|
| Prerequisites | Week 1-2 | __________ | [ ] |
| OAuth Consent Screen | Week 2-3 | __________ | [ ] |
| OAuth Credentials | Week 3 | __________ | [ ] |
| Documentation | Week 3-4 | __________ | [ ] |
| Demo Video | Week 4-5 | __________ | [ ] |
| Scope Justifications | Week 4-5 | __________ | [ ] |
| Security Implementation | Week 5-6 | __________ | [ ] |
| Testing | Week 6-7 | __________ | [ ] |
| Verification Submission | Week 7-8 | __________ | [ ] |
| Google Review | Week 8-20 | __________ | [ ] |
| **Total** | **~1-5 months** | | |

---

## Sign-Off

**Engineering Lead:** _____________________ Date: __________
**Security Officer:** _____________________ Date: __________
**Compliance Officer:** _____________________ Date: __________
**Legal Counsel:** _____________________ Date: __________

---

## Notes and Issues Log

**Date** | **Issue/Note** | **Resolution** | **Owner**
---------|----------------|----------------|----------
         |                |                |
         |                |                |
         |                |                |

---

## Reference Documents

- [GOOGLE_API_COMPLIANCE.md](/docs/GOOGLE_API_COMPLIANCE.md) - Comprehensive compliance guide
- [GOOGLE_API_README.md](/docs/GOOGLE_API_README.md) - Quick reference
- [google-api-disclosure.tsx](/pages/legal/google-api-disclosure.tsx) - Public disclosure page

---

**Last Updated:** 2025-12-07
**Checklist Version:** 1.0
**Next Review:** Before each new verification submission

---

**END OF CHECKLIST**
