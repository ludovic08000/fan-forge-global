/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Réinitialisez votre mot de passe TheForge</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={logoText}>⚒️ TheForge</Text>
        </Section>
        <Heading style={h1}>Réinitialisation du mot de passe</Heading>
        <Text style={text}>
          Vous avez demandé à réinitialiser votre mot de passe sur TheForge.
          Cliquez sur le bouton ci-dessous pour en choisir un nouveau.
        </Text>
        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            Réinitialiser mon mot de passe
          </Button>
        </Section>
        <Text style={footer}>
          Si vous n'avez pas fait cette demande, ignorez cet email. Votre mot de passe restera inchangé.
        </Text>
        <Text style={footerBrand}>© TheForge — theforge.fans</Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#f4f6f9', fontFamily: "'Sora', 'Segoe UI', Arial, sans-serif", padding: '20px 0' }
const container = { backgroundColor: '#ffffff', borderRadius: '12px', padding: '40px 32px', maxWidth: '480px', margin: '0 auto', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }
const header = { textAlign: 'center' as const, marginBottom: '24px' }
const logoText = { fontSize: '28px', fontWeight: 'bold' as const, color: '#3366cc', margin: '0' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#0a0f1a', margin: '0 0 16px', textAlign: 'center' as const }
const text = { fontSize: '15px', color: '#555e6e', lineHeight: '1.6', margin: '0 0 20px' }
const buttonSection = { textAlign: 'center' as const, margin: '28px 0' }
const button = { backgroundColor: '#3366cc', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '10px', padding: '14px 28px', textDecoration: 'none' }
const footer = { fontSize: '13px', color: '#999999', margin: '24px 0 0', textAlign: 'center' as const }
const footerBrand = { fontSize: '12px', color: '#cccccc', margin: '12px 0 0', textAlign: 'center' as const }
