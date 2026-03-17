/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Confirmez le changement d'email sur TheForge</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={logoText}>⚒️ TheForge</Text>
        </Section>
        <Heading style={h1}>Changement d'adresse email</Heading>
        <Text style={text}>
          Vous avez demandé à modifier votre email de{' '}
          <Link href={`mailto:${email}`} style={link}>{email}</Link>
          {' '}vers{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
        </Text>
        <Text style={text}>
          Cliquez ci-dessous pour confirmer ce changement :
        </Text>
        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            Confirmer le changement
          </Button>
        </Section>
        <Text style={footer}>
          Si vous n'êtes pas à l'origine de cette demande, sécurisez votre compte immédiatement.
        </Text>
        <Text style={footerBrand}>© TheForge — theforge.fans</Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#f4f6f9', fontFamily: "'Sora', 'Segoe UI', Arial, sans-serif", padding: '20px 0' }
const container = { backgroundColor: '#ffffff', borderRadius: '12px', padding: '40px 32px', maxWidth: '480px', margin: '0 auto', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }
const header = { textAlign: 'center' as const, marginBottom: '24px' }
const logoText = { fontSize: '28px', fontWeight: 'bold' as const, color: '#3366cc', margin: '0' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#0a0f1a', margin: '0 0 16px', textAlign: 'center' as const }
const text = { fontSize: '15px', color: '#555e6e', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: '#3366cc', textDecoration: 'underline' }
const buttonSection = { textAlign: 'center' as const, margin: '28px 0' }
const button = { backgroundColor: '#3366cc', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '10px', padding: '14px 28px', textDecoration: 'none' }
const footer = { fontSize: '13px', color: '#999999', margin: '24px 0 0', textAlign: 'center' as const }
const footerBrand = { fontSize: '12px', color: '#cccccc', margin: '12px 0 0', textAlign: 'center' as const }
