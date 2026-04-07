/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const BRAND = 'TheForge'

interface OtpCodeEmailProps {
  code?: string
}

const OtpCodeEmail = ({ code = '000000' }: OtpCodeEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre code de vérification TheForge : {code}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandHeader}>🔥 {BRAND}</Text>
        <Heading style={h1}>Code de vérification</Heading>
        <Text style={text}>
          Voici votre code de vérification à usage unique :
        </Text>
        <Section style={codeContainer}>
          <Text style={codeText}>{code}</Text>
        </Section>
        <Text style={textSmall}>
          Ce code expire dans 10 minutes.{'\n'}
          Si vous n'avez pas demandé ce code, ignorez cet email.
        </Text>
        <Text style={footer}>L'équipe {BRAND}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OtpCodeEmail,
  subject: 'Votre code de vérification TheForge',
  displayName: 'Code OTP de vérification',
  previewData: { code: '847293' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Sora', 'Poppins', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '480px', margin: '0 auto' }
const brandHeader = {
  fontSize: '20px',
  fontWeight: 'bold' as const,
  color: 'hsl(225, 70%, 55%)',
  margin: '0 0 24px',
  textAlign: 'center' as const,
}
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(222.2, 84%, 4.9%)', margin: '0 0 20px', textAlign: 'center' as const }
const text = { fontSize: '14px', color: 'hsl(215.4, 16.3%, 46.9%)', lineHeight: '1.5', margin: '0 0 20px', textAlign: 'center' as const }
const codeContainer = {
  background: 'linear-gradient(135deg, hsl(225, 70%, 55%) 0%, hsl(260, 50%, 50%) 100%)',
  borderRadius: '10px',
  padding: '20px',
  margin: '0 0 24px',
  textAlign: 'center' as const,
}
const codeText = {
  fontSize: '32px',
  fontWeight: 'bold' as const,
  letterSpacing: '8px',
  color: '#ffffff',
  fontFamily: 'monospace',
  margin: '0',
}
const textSmall = { fontSize: '12px', color: '#999999', lineHeight: '1.5', margin: '0 0 20px', textAlign: 'center' as const }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', textAlign: 'center' as const }
