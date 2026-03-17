/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre code de vérification TheForge</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={logoText}>⚒️ TheForge</Text>
        </Section>
        <Heading style={h1}>Code de vérification</Heading>
        <Text style={text}>Utilisez le code ci-dessous pour confirmer votre identité :</Text>
        <Section style={codeSection}>
          <Text style={codeStyle}>{token}</Text>
        </Section>
        <Text style={footer}>
          Ce code expirera dans quelques minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
        </Text>
        <Text style={footerBrand}>© TheForge — theforge.fans</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#f4f6f9', fontFamily: "'Sora', 'Segoe UI', Arial, sans-serif", padding: '20px 0' }
const container = { backgroundColor: '#ffffff', borderRadius: '12px', padding: '40px 32px', maxWidth: '480px', margin: '0 auto', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }
const header = { textAlign: 'center' as const, marginBottom: '24px' }
const logoText = { fontSize: '28px', fontWeight: 'bold' as const, color: '#3366cc', margin: '0' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#0a0f1a', margin: '0 0 16px', textAlign: 'center' as const }
const text = { fontSize: '15px', color: '#555e6e', lineHeight: '1.6', margin: '0 0 20px', textAlign: 'center' as const }
const codeSection = { textAlign: 'center' as const, margin: '20px 0 28px' }
const codeStyle = { fontFamily: "'Space Grotesk', Courier, monospace", fontSize: '32px', fontWeight: 'bold' as const, color: '#3366cc', letterSpacing: '6px', margin: '0', padding: '16px 24px', backgroundColor: '#f4f6f9', borderRadius: '10px', display: 'inline-block' }
const footer = { fontSize: '13px', color: '#999999', margin: '24px 0 0', textAlign: 'center' as const }
const footerBrand = { fontSize: '12px', color: '#cccccc', margin: '12px 0 0', textAlign: 'center' as const }
