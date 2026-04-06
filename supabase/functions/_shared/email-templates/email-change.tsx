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
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

const BRAND = 'TheForge'

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Confirmez votre changement d'email {BRAND}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandHeader}>🔥 {BRAND}</Text>
        <Heading style={h1}>Changement d'adresse email</Heading>
        <Text style={text}>
          Vous avez demandé à changer votre adresse email sur {BRAND} de{' '}
          <Link href={`mailto:${email}`} style={link}>
            {email}
          </Link>{' '}
          à{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>
          .
        </Text>
        <Text style={text}>
          Cliquez ci-dessous pour confirmer ce changement :
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirmer le changement
        </Button>
        <Text style={footer}>
          Si vous n'avez pas demandé ce changement, sécurisez immédiatement votre compte.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

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
const link = { color: 'hsl(225, 70%, 55%)', textDecoration: 'underline' }
const button = {
  backgroundColor: 'hsl(225, 70%, 55%)',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '10px',
  padding: '14px 28px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', textAlign: 'center' as const }
