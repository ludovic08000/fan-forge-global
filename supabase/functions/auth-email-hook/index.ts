import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const EMAIL_SUBJECTS: Record<string, string> = {
  signup: 'Confirmez votre email',
  invite: 'Vous avez été invité',
  magiclink: 'Votre lien de connexion',
  recovery: 'Réinitialisez votre mot de passe',
  email_change: 'Confirmez votre nouvel email',
  reauthentication: 'Votre code de vérification',
}

const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

// Configuration
const SITE_NAME = "TheForge"
const SENDER_DOMAIN = "notify.theforge.fans"
const ROOT_DOMAIN = "theforge.fans"
const FROM_DOMAIN = "notify.theforge.fans"

// ──────────────────────────────────────────────
// Standard Webhooks signature verification
// Compatible with Supabase HTTPS hooks (whsec_ secret)
// ──────────────────────────────────────────────

async function verifyStandardWebhook(
  body: string,
  headers: Headers,
  secret: string
): Promise<boolean> {
  const msgId = headers.get('webhook-id')
  const msgTimestamp = headers.get('webhook-timestamp')
  const msgSignature = headers.get('webhook-signature')

  if (!msgId || !msgTimestamp || !msgSignature) {
    console.error('Missing standard webhook headers', {
      hasId: !!msgId,
      hasTimestamp: !!msgTimestamp,
      hasSignature: !!msgSignature,
    })
    return false
  }

  // Reject stale timestamps (> 5 minutes old)
  const ts = parseInt(msgTimestamp, 10)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - ts) > 300) {
    console.error('Webhook timestamp too old or in the future', { ts, now })
    return false
  }

  // Extract the base64 key from the secret (strip "whsec_" prefix if present)
  let keyBase64 = secret
  if (keyBase64.startsWith('whsec_')) {
    keyBase64 = keyBase64.slice(6)
  }

  // Decode the base64 key
  const keyBytes = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0))

  // Build signed content: "msg_id.timestamp.body"
  const signedContent = `${msgId}.${msgTimestamp}.${body}`
  const encoder = new TextEncoder()

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    encoder.encode(signedContent)
  )

  const expectedSig = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)))

  // msgSignature can contain multiple space-separated signatures (v1,<base64>)
  const signatures = msgSignature.split(' ')
  for (const sig of signatures) {
    const parts = sig.split(',')
    if (parts.length !== 2) continue
    const [version, sigValue] = parts
    if (version === 'v1' && sigValue === expectedSig) {
      return true
    }
  }

  console.error('Webhook signature mismatch')
  return false
}

// ──────────────────────────────────────────────
// Preview endpoint (unchanged, uses LOVABLE_API_KEY)
// ──────────────────────────────────────────────

const SAMPLE_PROJECT_URL = "https://fan-forge-global.lovable.app"
const SAMPLE_EMAIL = "user@example.test"
const SAMPLE_DATA: Record<string, object> = {
  signup: { siteName: SITE_NAME, siteUrl: SAMPLE_PROJECT_URL, recipient: SAMPLE_EMAIL, confirmationUrl: SAMPLE_PROJECT_URL },
  magiclink: { siteName: SITE_NAME, confirmationUrl: SAMPLE_PROJECT_URL },
  recovery: { siteName: SITE_NAME, confirmationUrl: SAMPLE_PROJECT_URL },
  invite: { siteName: SITE_NAME, siteUrl: SAMPLE_PROJECT_URL, confirmationUrl: SAMPLE_PROJECT_URL },
  email_change: { siteName: SITE_NAME, email: SAMPLE_EMAIL, newEmail: SAMPLE_EMAIL, confirmationUrl: SAMPLE_PROJECT_URL },
  reauthentication: { token: '123456' },
}

async function handlePreview(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  const authHeader = req.headers.get('Authorization')
  if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let type: string
  try { type = (await req.json()).type } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const EmailTemplate = EMAIL_TEMPLATES[type]
  if (!EmailTemplate) {
    return new Response(JSON.stringify({ error: `Unknown type: ${type}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const html = await renderAsync(React.createElement(EmailTemplate, SAMPLE_DATA[type] || {}))
  return new Response(html, {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  })
}

// ──────────────────────────────────────────────
// Main webhook handler (Supabase Send Email Hook)
// ──────────────────────────────────────────────

async function handleWebhook(req: Request): Promise<Response> {
  const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET')
  if (!hookSecret) {
    console.error('SEND_EMAIL_HOOK_SECRET not configured')
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Read body as text for signature verification
  const bodyText = await req.text()

  // Extract the actual signing key (remove "v1," prefix if present)
  let signingKey = hookSecret
  if (signingKey.startsWith('v1,')) {
    signingKey = signingKey.slice(3)
  }

  // Verify Standard Webhooks signature
  const isValid = await verifyStandardWebhook(bodyText, req.headers, signingKey)
  if (!isValid) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Parse the Supabase hook payload
  let payload: any
  try {
    payload = JSON.parse(bodyText)
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Supabase Send Email Hook payload format:
  // { user: { id, email, ... }, email_data: { token, token_hash, redirect_to, email_action_type, site_url, token_new } }
  const user = payload.user
  const emailData = payload.email_data

  if (!user || !emailData) {
    console.error('Invalid hook payload structure', { hasUser: !!user, hasEmailData: !!emailData })
    return new Response(JSON.stringify({ error: 'Invalid payload' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const emailType = emailData.email_action_type
  console.log('Received Supabase auth hook', { emailType, email: user.email })

  const EmailTemplate = EMAIL_TEMPLATES[emailType]
  if (!EmailTemplate) {
    console.error('Unknown email type', { emailType })
    return new Response(JSON.stringify({ error: `Unknown email type: ${emailType}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Build confirmation URL from token_hash + redirect_to
  const siteUrl = emailData.site_url || `https://${ROOT_DOMAIN}`
  let confirmationUrl = siteUrl
  if (emailData.token_hash) {
    const type = emailType === 'recovery' ? 'recovery' :
                 emailType === 'signup' ? 'signup' :
                 emailType === 'invite' ? 'invite' :
                 emailType === 'magiclink' ? 'magiclink' :
                 emailType === 'email_change' ? 'email_change' : emailType
    confirmationUrl = `${siteUrl}/auth/confirm?token_hash=${emailData.token_hash}&type=${type}`
    if (emailData.redirect_to) {
      confirmationUrl += `&redirect_to=${encodeURIComponent(emailData.redirect_to)}`
    }
  }

  // Build template props
  const templateProps = {
    siteName: SITE_NAME,
    siteUrl: `https://${ROOT_DOMAIN}`,
    recipient: user.email,
    confirmationUrl,
    token: emailData.token,
    email: user.email,
    newEmail: emailData.token_new ? user.email : undefined,
  }

  // Render React Email
  const html = await renderAsync(React.createElement(EmailTemplate, templateProps))
  const text = await renderAsync(React.createElement(EmailTemplate, templateProps), { plainText: true })

  // Enqueue via pgmq for async processing
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const messageId = crypto.randomUUID()

  // Log pending
  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: emailType,
    recipient_email: user.email,
    status: 'pending',
  })

  const { error: enqueueError } = await supabase.rpc('enqueue_email', {
    queue_name: 'auth_emails',
    payload: {
      message_id: messageId,
      to: user.email,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: EMAIL_SUBJECTS[emailType] || 'Notification',
      html,
      text,
      purpose: 'transactional',
      label: emailType,
      queued_at: new Date().toISOString(),
    },
  })

  if (enqueueError) {
    console.error('Failed to enqueue auth email', { error: enqueueError, emailType })
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: emailType,
      recipient_email: user.email,
      status: 'failed',
      error_message: 'Failed to enqueue email',
    })
    return new Response(JSON.stringify({ error: 'Failed to enqueue email' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('Auth email enqueued successfully', { emailType, email: user.email })

  return new Response(
    JSON.stringify({ success: true, queued: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// ──────────────────────────────────────────────
// Router
// ──────────────────────────────────────────────

Deno.serve(async (req) => {
  const url = new URL(req.url)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Preview endpoint
  if (url.pathname.endsWith('/preview')) {
    return handlePreview(req)
  }

  // Main webhook handler
  try {
    return await handleWebhook(req)
  } catch (error) {
    console.error('Webhook handler error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
