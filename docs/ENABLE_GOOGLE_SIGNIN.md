# Activate real COMMON registration with Google (no custom domain required)

Verified on November 12, 2026:
- COMMON site: https://isaacwhite9999.github.io/COMMON-/live/
- Supabase project: https://supabase.com/dashboard/project/addvunzxlrxtxqsaizuw
- Public Supabase Auth settings endpoint returned HTTP 200, \`disable_signup=false\`, and \`external.google=false\`.
- Public Auth settings say email provider is available. **Default Supabase SMTP cannot deliver outside the project team**; no general email signup until custom SMTP is configured.
- Hosted database has zero Auth users at the time of this check. The signup profile trigger passed a real test in a rolled-back transaction.
- COMMON's browser now checks the public Supabase provider settings itself and enables the Google sign-in button only after the provider is genuinely enabled.

## Owner setup in Google (must be done inside the owner's Google account)

1. Open https://console.cloud.google.com/auth/overview and create/select a Google Cloud project for COMMON.
2. Complete **Branding**: application name COMMON, support email, audience.
3. Set **Audience** to External if users other than your organization will sign in. If the Google OAuth app is in **Testing**, add your own Google address to **Test users** first. Using only \`openid\`, \`email\` and \`profile\` keeps permission scope minimal.
4. In https://console.cloud.google.com/auth/clients choose **Create client**, application type **Web application**.
5. Under **Authorized JavaScript origins**, add EXACTLY:

   \`\`\`text
   https://isaacwhite9999.github.io
   \`\`\`

6. Under **Authorized redirect URIs**, add EXACTLY:

   \`\`\`text
   https://addvunzxlrxtxqsaizuw.supabase.co/auth/v1/callback
   \`\`\`

7. Save the generated Google OAuth **Client ID** and **Client secret**. Do not paste the client secret into ChatGPT, GitHub, \`docs/config.js\`, source control, or any public client. Only enter it into the Supabase provider configuration.

## Owner setup in Supabase

1. Go to https://supabase.com/dashboard/project/addvunzxlrxtxqsaizuw/auth/providers
2. Open **Google** and enable it. Enter your Google OAuth client ID and client secret there. Save.
3. Go to https://supabase.com/dashboard/project/addvunzxlrxtxqsaizuw/auth/url-configuration
4. Set Site URL to:

   \`\`\`text
   https://isaacwhite9999.github.io/COMMON-/live/
   \`\`\`

5. Add **Redirect URLs** entry:

   \`\`\`text
   https://isaacwhite9999.github.io/COMMON-/live/
   \`\`\`

6. Use this public Google callback, not the website URL, in Google Cloud's Authorized redirect URIs. The two URLs have different jobs.
7. Reload the COMMON signup screen. The button checks \`GET /auth/v1/settings\` and automatically enables when the configured Google provider is publicly reported as active. No new GitHub commit or hardcoded Google secret is needed.

## Test safely

1. Open the COMMON site in a clean private browser window.
2. Confirm the **Continue with Google** button is enabled; click.
3. Sign in with a Google account permitted by the app's Audience/Test users configuration.
4. Confirm Google returns to COMMON and a profile appears.
5. Open Research Studio and verify it uses the same signed-in Supabase session.
6. Check Supabase Authentication > Users for the new member and ensure \`public.profiles\` has a matching row. Verify group/data privacy against a second account before opening public registration.

Do not disable verification to hide a configuration error. Do not add a service-role key to any browser code. A Google OAuth client secret must remain exclusively in Google/Supabase secure settings.

## If email/password signup is needed

Supabase's built-in SMTP only sends confirmation to authorized team addresses. For unrestricted public email signup, configure custom SMTP at https://supabase.com/dashboard/project/addvunzxlrxtxqsaizuw/auth/smtp and verify its delivery, sending limits, bounce and abuse handling. The default email/password provider being enabled is *not* evidence that public confirmation emails are delivering.

References:
- https://supabase.com/docs/guides/auth/social-sign-in/auth-google
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/redirect-urls
