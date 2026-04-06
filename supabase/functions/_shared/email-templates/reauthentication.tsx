/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

const BRAND = 'TheForge'

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre code de vérification {BRAND}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandHeader}>🔥 {BRAND}</Text>
        <Heading style={h1}>Code de vérification</Heading>
        <Text style={text}>Utilisez le code ci-dessous pour confirmer votre identité :</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Ce code expirera sous peu. Si vous ne l'avez pas demandé, ignorez cet email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Sora', 'Poppins', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '480px', margin: '0 auto' }
const brandHeader = {
  fontSize: '20px',
  fontWeight: 'bold' as const,
  color: 'hsl(225, 70%, 55%)',
  margin: '0 0 24px',
  textAlign: 'center' as const,
}
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(222.2, 84%, 4.9%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(215.4, 16.3%, 46.9%)',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: 'hsl(225, 70%, 55%)',
  margin: '0 0 30px',
  textAlign: 'center' as const,
  letterSpacing: '6px',
  backgroundColor: 'hsl(210, 40%, 96.1%)',
  padding: '16px',
  borderRadius: '10px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', textAlign: 'center' as const }
