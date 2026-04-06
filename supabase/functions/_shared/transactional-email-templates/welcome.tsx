/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const BRAND = 'TheForge'

interface WelcomeEmailProps {
  name?: string
}

const WelcomeEmail = ({ name }: WelcomeEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Bienvenue sur {BRAND} !</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandHeader}>🔥 {BRAND}</Text>
        <Heading style={h1}>
          {name ? `Bienvenue ${name} !` : 'Bienvenue sur TheForge !'}
        </Heading>
        <Text style={text}>
          Votre compte est maintenant actif. Explorez les créateurs, abonnez-vous
          et profitez de contenus exclusifs.
        </Text>
        <Button style={button} href="https://theforge.fans">
          Découvrir TheForge
        </Button>
        <Text style={footer}>L'équipe {BRAND}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: 'Bienvenue sur TheForge !',
  displayName: 'Email de bienvenue',
  previewData: { name: 'Marie' },
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
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(222.2, 84%, 4.9%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(215.4, 16.3%, 46.9%)', lineHeight: '1.5', margin: '0 0 25px' }
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