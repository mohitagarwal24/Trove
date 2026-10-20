# Google sign-in and email verification setup

Both integrations use free Google accounts and OAuth credentials. No Firebase project, paid authentication service, custom domain, SMTP subscription or billing account is needed for this setup. Keep the Cloud project without linked billing and use standard free quotas; [Google documents standard Gmail API usage as having no additional cost](https://developers.google.com/workspace/gmail/api/reference/quota#pricing). Use a Google account you control. Credentials belong in the private server environment, never browser code or Git.

## 1. Create a Google Cloud project

Open [Google Cloud Console](https://console.cloud.google.com/projectcreate) and create a project named **Trove**. Select it before every following step. In **Google Auth Platform → Branding**, enter the app name, your support email and developer contact email. Choose **External** under Audience, initially **Testing**, and add your own/team Google accounts as test users. Use the real Trove URLs if the console asks for homepage/privacy links:

- Home: `https://trove-mohit24.onrender.com`
- Privacy: `https://trove-mohit24.onrender.com/privacy`
- Terms: `https://trove-mohit24.onrender.com/terms`

Do not claim ownership of the shared `onrender.com` domain. Extra branding/domain verification requirements depend on the publishing configuration; basic testing can use the app's exact callback URLs below.

## 2. Create the Google sign-in client

In [Google Auth Platform → Clients](https://console.cloud.google.com/auth/clients), choose **Create client → Web application**. Name it **Trove sign-in**. Add these **Authorized redirect URIs** exactly, with no trailing slash:

```text
http://localhost:3000/api/auth/google/callback
https://trove-mohit24.onrender.com/api/auth/google/callback
```

The server handles the redirect; an Authorized JavaScript origin is not needed for this implementation. Copy the **Client ID** and **Client secret** when creating the client (download the client JSON privately if offered). They map to:

```dotenv
GOOGLE_CLIENT_ID=your-sign-in-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-sign-in-client-secret
```

Trove requests only `openid email profile`. Do not add Gmail permissions to the customer sign-in flow. It verifies Google's ID token and verified-email claim, creates a private workspace for new users, and requires explicit linking for an existing password account with the same email. See [Google's OpenID Connect setup](https://developers.google.com/identity/openid-connect/openid-connect).

## 3. Create the Gmail sender credentials

This is a separate OAuth client for **your sending mailbox**, not a permission customers grant. You can use the same Cloud project. A separate Gmail account for Trove is convenient; an existing Gmail account also works.

1. Open [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com) in the selected project and click **Enable**. No billing upgrade is needed for this flow.
2. Under Google Auth Platform → Data Access, add only `https://www.googleapis.com/auth/gmail.send` for the sender authorization. Add the sending account to Audience → Test users while the project is Testing. Trove's sign-in code still requests only its three identity scopes.
3. Create another **Web application** OAuth client named **Trove mail sender**. Its Authorized redirect URI is exactly `https://developers.google.com/oauthplayground` (no trailing slash).
4. Open [Google OAuth Playground](https://developers.google.com/oauthplayground/). Open the gear/settings and enable **Use your own OAuth credentials**. Paste the **mail sender** client ID and secret. Keep OAuth flow **Server-side**, Access type **Offline**, and Force prompt **Consent Screen**.
5. In Step 1's scope box enter `https://www.googleapis.com/auth/gmail.send`, click **Authorize APIs**, and sign in as the mailbox Trove will send from. Consent to sending mail. If Google blocks the flow, check the selected project, test user, redirect URI and account policy; do not switch to broader Gmail scopes.
6. In Step 2 click **Exchange authorization code for tokens**. Copy the **Refresh token**, not the short-lived Access token. If no refresh token appears, repeat with Offline access and Consent Screen selected.
7. Save these four server values:

```dotenv
GMAIL_CLIENT_ID=your-mail-sender-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-mail-sender-client-secret
GMAIL_REFRESH_TOKEN=your-mail-sender-refresh-token
MAIL_FROM=the-exact-authorized-sender@gmail.com
```

The recipient may use Gmail or another email provider. They do not need access to your Cloud project or Gmail send permission. `MAIL_FROM` must be your authorized sender; changing the string does not authorize another mailbox.

Google classifies [`gmail.send` as sensitive](https://developers.google.com/workspace/gmail/api/auth/scopes). In External **Testing** mode, its [refresh token expires after seven days](https://developers.google.com/identity/protocols/oauth2#expiration). Reauthorize the sender and replace `GMAIL_REFRESH_TOKEN` before the hackathon if needed. A durable public launch needs the appropriate production consent/verification configuration; changing publishing status alone is not a substitute for Google's review requirements. Gmail account and API sending limits still apply.

## 4. Put the values in Trove

### Local development

Edit the existing **`.env` in the repository root** (`/home/mohitagarwal_24/hackathons/Trove/.env`). Fill in the six values above. Keep the existing database, encryption and PayPal values. Use:

```dotenv
APP_URL=http://localhost:3000
```

Restart `npm run dev` after editing. If running the production build locally, rebuild and restart it. `.env.example` documents names only; putting secrets there will not configure the app and can publish them.

### Hosted Render app

Open [Render Dashboard](https://dashboard.render.com/) → Trove web service → **Environment**. Add the six variables using those exact names and choose **Save, rebuild, and deploy**. The service's existing secret `.env` file contains the database and encryption settings: preserve it. Do not replace the environment with just these six values. The hosted value is:

```dotenv
APP_URL=https://trove-mohit24.onrender.com
```

No credential gets a `NEXT_PUBLIC_` prefix. Never commit client JSON, paste refresh tokens into issues/chat, or send screenshots containing secrets. Tell your collaborator only that the values have been added, or the private file path where you placed them.

## 5. Test the real flows

Run `npm run check:integrations` locally for a secret-free presence check. It does not prove credentials are valid or send mail. After deployment:

1. Open Trove in an incognito window. Sign in → **Continue with Google** → choose an allowed Google account. Confirm Account shows that Google is connected and the workspace is private.
2. Sign out. Create an account using a different email address and a password of at least 12 characters. Trove opens **Verify your email** and sends a six-digit code. Check inbox/spam, enter the code, and confirm the interrupted action resumes.
3. Wrong/expired codes must fail. A resend is available after 60 seconds; only the latest code works in the browser that requested it. Five wrong guesses exhaust that code. Successful confirmation rotates the session and invalidates the code.
4. Close and reopen sign-in before verification: the same browser can resume the pending step. **Use another account** clears that pending session. Existing password users without a verified email also need to confirm it at their next login.
5. Test **Forgot password?** with a registered address. Use the email link once, set a new password, and sign in. A successful email reset also proves email ownership, revokes prior sessions/tokens, and clears pending codes.

Until sender credentials work, pending password accounts cannot use private workspaces, create purchases or connect agents. The app reports delivery failure rather than skipping verification or claiming that a code was sent. Google-verified users can sign in without this additional code. Actual delivery and Google consent acceptance remain unverified until you supply credentials and complete these checks.

## Common setup errors

| Error                                         | Check                                                                                                                                  |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `redirect_uri_mismatch`                       | The full callback URI must match exactly, including scheme, hostname, port and path. Local and hosted apps need separate entries.      |
| Google option is missing                      | Both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` must exist on the running server; restart/redeploy after adding them.               |
| `access_denied` or a testing-user restriction | Add the actual authorizing account in the selected project's Audience settings. Workspace administrators may impose additional policy. |
| Gmail `invalid_grant`                         | Reauthorize the sender; testing expiry, password changes or revoked consent can invalidate refresh tokens.                             |
| Email cannot be sent                          | Enable Gmail API; use the mail client's matching ID/secret/refresh token and actual sender address. Check its send quota.              |
| Google says an email already has an account   | Sign in with its password, verify its email if needed, then explicitly connect Google from Account.                                    |
