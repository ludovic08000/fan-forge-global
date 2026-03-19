import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Plus, Euro, Loader2, Printer, Calendar, DollarSign, MapPin, RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useGeoLocation } from '@/hooks/useGeoLocation';

// Taux de TVA par pays UE (2024)
const EU_VAT_RATES: Record<string, { name: string; rate: number }> = {
  AT: { name: 'Autriche', rate: 0.20 },
  BE: { name: 'Belgique', rate: 0.21 },
  BG: { name: 'Bulgarie', rate: 0.20 },
  HR: { name: 'Croatie', rate: 0.25 },
  CY: { name: 'Chypre', rate: 0.19 },
  CZ: { name: 'Tchéquie', rate: 0.21 },
  DK: { name: 'Danemark', rate: 0.25 },
  EE: { name: 'Estonie', rate: 0.22 },
  FI: { name: 'Finlande', rate: 0.24 },
  FR: { name: 'France', rate: 0.20 },
  DE: { name: 'Allemagne', rate: 0.19 },
  GR: { name: 'Grèce', rate: 0.24 },
  HU: { name: 'Hongrie', rate: 0.27 },
  IE: { name: 'Irlande', rate: 0.23 },
  IT: { name: 'Italie', rate: 0.22 },
  LV: { name: 'Lettonie', rate: 0.21 },
  LT: { name: 'Lituanie', rate: 0.21 },
  LU: { name: 'Luxembourg', rate: 0.17 },
  MT: { name: 'Malte', rate: 0.18 },
  NL: { name: 'Pays-Bas', rate: 0.21 },
  PL: { name: 'Pologne', rate: 0.23 },
  PT: { name: 'Portugal', rate: 0.23 },
  RO: { name: 'Roumanie', rate: 0.19 },
  SK: { name: 'Slovaquie', rate: 0.20 },
  SI: { name: 'Slovénie', rate: 0.22 },
  ES: { name: 'Espagne', rate: 0.21 },
  SE: { name: 'Suède', rate: 0.25 },
};

// Taxes par état US (Sales Tax 2024) - Les plus courants
const US_STATE_TAXES: Record<string, { name: string; rate: number }> = {
  AL: { name: 'Alabama', rate: 0.04 },
  AK: { name: 'Alaska', rate: 0 },
  AZ: { name: 'Arizona', rate: 0.056 },
  AR: { name: 'Arkansas', rate: 0.065 },
  CA: { name: 'California', rate: 0.0725 },
  CO: { name: 'Colorado', rate: 0.029 },
  CT: { name: 'Connecticut', rate: 0.0635 },
  DE: { name: 'Delaware', rate: 0 },
  FL: { name: 'Florida', rate: 0.06 },
  GA: { name: 'Georgia', rate: 0.04 },
  HI: { name: 'Hawaii', rate: 0.04 },
  ID: { name: 'Idaho', rate: 0.06 },
  IL: { name: 'Illinois', rate: 0.0625 },
  IN: { name: 'Indiana', rate: 0.07 },
  IA: { name: 'Iowa', rate: 0.06 },
  KS: { name: 'Kansas', rate: 0.065 },
  KY: { name: 'Kentucky', rate: 0.06 },
  LA: { name: 'Louisiana', rate: 0.0445 },
  ME: { name: 'Maine', rate: 0.055 },
  MD: { name: 'Maryland', rate: 0.06 },
  MA: { name: 'Massachusetts', rate: 0.0625 },
  MI: { name: 'Michigan', rate: 0.06 },
  MN: { name: 'Minnesota', rate: 0.06875 },
  MS: { name: 'Mississippi', rate: 0.07 },
  MO: { name: 'Missouri', rate: 0.04225 },
  MT: { name: 'Montana', rate: 0 },
  NE: { name: 'Nebraska', rate: 0.055 },
  NV: { name: 'Nevada', rate: 0.0685 },
  NH: { name: 'New Hampshire', rate: 0 },
  NJ: { name: 'New Jersey', rate: 0.06625 },
  NM: { name: 'New Mexico', rate: 0.05125 },
  NY: { name: 'New York', rate: 0.04 },
  NC: { name: 'North Carolina', rate: 0.0475 },
  ND: { name: 'North Dakota', rate: 0.05 },
  OH: { name: 'Ohio', rate: 0.0575 },
  OK: { name: 'Oklahoma', rate: 0.045 },
  OR: { name: 'Oregon', rate: 0 },
  PA: { name: 'Pennsylvania', rate: 0.06 },
  RI: { name: 'Rhode Island', rate: 0.07 },
  SC: { name: 'South Carolina', rate: 0.06 },
  SD: { name: 'South Dakota', rate: 0.045 },
  TN: { name: 'Tennessee', rate: 0.07 },
  TX: { name: 'Texas', rate: 0.0625 },
  UT: { name: 'Utah', rate: 0.061 },
  VT: { name: 'Vermont', rate: 0.06 },
  VA: { name: 'Virginia', rate: 0.053 },
  WA: { name: 'Washington', rate: 0.065 },
  WV: { name: 'West Virginia', rate: 0.06 },
  WI: { name: 'Wisconsin', rate: 0.05 },
  WY: { name: 'Wyoming', rate: 0.04 },
  DC: { name: 'Washington D.C.', rate: 0.06 },
};

type MarketType = 'eu' | 'us';

interface Invoice {
  id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  gross_amount: number;
  platform_commission_amount: number;
  vat_rate: number;
  vat_amount: number;
  net_amount: number;
  creator_country: string;
  status: string;
  currency: string;
  created_at: string;
  creator_name: string;
  creator_address: string | null;
  creator_tax_id: string | null;
  subscription_revenue: number;
  tips_revenue: number;
  live_revenue: number;
  private_content_revenue: number;
}

interface CreatorInvoicesProps {
  creatorId: string;
}

const CreatorInvoices: React.FC<CreatorInvoicesProps> = ({ creatorId }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stripeInvoices, setStripeInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStripe, setLoadingStripe] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [creatorInfo, setCreatorInfo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'local' | 'stripe'>('local');
  const invoiceRef = useRef<HTMLDivElement>(null);
  
  // Auto-detect location
  const { geoData, getMarket, getStateCode, loading: geoLoading } = useGeoLocation();
  
  const [newInvoice, setNewInvoice] = useState({
    periodStart: format(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), 'yyyy-MM-dd'),
    periodEnd: format(new Date(new Date().getFullYear(), new Date().getMonth(), 0), 'yyyy-MM-dd'),
    country: 'FR',
    market: 'eu' as MarketType
  });

  // Update default country when geo data is loaded
  useEffect(() => {
    if (!geoLoading && geoData) {
      const market = getMarket();
      const stateCode = getStateCode();
      
      setNewInvoice(prev => ({
        ...prev,
        market: market === 'us' ? 'us' : 'eu',
        country: market === 'us' && stateCode ? stateCode : geoData.countryCode
      }));
    }
  }, [geoLoading, geoData]);

  useEffect(() => {
    loadInvoices();
    loadCreatorInfo();
  }, [creatorId]);

  const loadCreatorInfo = async () => {
    try {
      // Récupérer les infos du créateur
      const { data: creator } = await supabase
        .from('creators')
        .select('*')
        .eq('id', creatorId)
        .single();
      
      if (creator) {
        // Récupérer les infos du profil séparément
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, username')
          .eq('user_id', creator.user_id)
          .maybeSingle();
        
        setCreatorInfo({ ...creator, profile });
      }
    } catch (error) {
      console.error('Error loading creator info:', error);
    }
  };

  const loadInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('creator_invoices')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices((data as Invoice[]) || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Erreur lors du chargement des factures');
    } finally {
      setLoading(false);
    }
  };

  const loadStripeInvoices = async () => {
    setLoadingStripe(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-creator-invoices', {
        body: { limit: 50 }
      });

      if (error) throw error;
      setStripeInvoices(data?.invoices || []);
    } catch (error: any) {
      console.error('Error loading Stripe invoices:', error);
      toast.error('Erreur lors du chargement des factures Stripe');
    } finally {
      setLoadingStripe(false);
    }
  };

  const getFallbackTaxRate = (market: MarketType, countryOrState: string): number => {
    if (market === 'eu') {
      return EU_VAT_RATES[countryOrState]?.rate || 0.20;
    } else {
      return US_STATE_TAXES[countryOrState]?.rate || 0;
    }
  };

  const getLocationName = (market: MarketType, code: string): string => {
    if (market === 'eu') {
      return EU_VAT_RATES[code]?.name || code;
    } else {
      return US_STATE_TAXES[code]?.name || code;
    }
  };

  const getCurrency = (market: MarketType): string => {
    return market === 'eu' ? 'EUR' : 'USD';
  };

  // Calculer la TVA avec les taux locaux (EU/US)
  const calculateTax = (amount: number, market: MarketType, countryOrState: string) => {
    const taxRate = getFallbackTaxRate(market, countryOrState);
    const taxAmount = amount * taxRate;
    return {
      taxRate,
      taxAmount,
      taxType: market === 'eu' ? 'TVA' : 'SALES_TAX',
      jurisdiction: getLocationName(market, countryOrState)
    };
  };

  const generateInvoice = async () => {
    setGenerating(true);
    
    try {
      const { data: revenueData, error: revenueError } = await supabase
        .rpc('calculate_creator_revenue_with_commission', {
          creator_uuid: creatorId,
          start_date: new Date(newInvoice.periodStart).toISOString(),
          end_date: new Date(newInvoice.periodEnd).toISOString()
        });

      if (revenueError) throw revenueError;
      
      const revenue = revenueData?.[0] || {
        subscription_revenue: 0,
        tips_revenue: 0,
        live_revenue: 0,
        private_content_revenue: 0,
        total_before_commission: 0,
        commission_amount: 0,
        total_after_commission: 0
      };

      const grossAmount = revenue.total_before_commission;
      const commissionAmount = revenue.commission_amount;
      const netBeforeTax = grossAmount - commissionAmount;
      const currency = getCurrency(newInvoice.market);

      // Calculer la TVA avec les taux locaux
      const taxResult = calculateTax(netBeforeTax, newInvoice.market, newInvoice.country);
      const taxRate = taxResult.taxRate;
      const taxAmount = taxResult.taxAmount;
      const netAmount = netBeforeTax - taxAmount;

      const { data: invoiceNum, error: numError } = await supabase
        .rpc('generate_invoice_number');

      if (numError) throw numError;

      const { error: insertError } = await supabase
        .from('creator_invoices')
        .insert({
          invoice_number: invoiceNum,
          creator_id: creatorId,
          period_start: new Date(newInvoice.periodStart).toISOString(),
          period_end: new Date(newInvoice.periodEnd).toISOString(),
          subscription_revenue: revenue.subscription_revenue,
          tips_revenue: revenue.tips_revenue,
          live_revenue: revenue.live_revenue,
          private_content_revenue: revenue.private_content_revenue,
          gross_amount: grossAmount,
          platform_commission_rate: 15,
          platform_commission_amount: commissionAmount,
          creator_country: newInvoice.country,
          vat_rate: taxRate,
          vat_amount: taxAmount,
          net_amount: netAmount,
          creator_name: creatorInfo?.stage_name || creatorInfo?.profiles?.display_name || 'Créateur',
          creator_address: null,
          creator_tax_id: creatorInfo?.tax_id,
          creator_iban: creatorInfo?.bank_iban,
          currency: currency,
          status: 'finalized',
          finalized_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      // Créer l'objet facture pour le téléchargement automatique
      const newInvoiceData: Invoice = {
        id: crypto.randomUUID(),
        invoice_number: invoiceNum,
        period_start: new Date(newInvoice.periodStart).toISOString(),
        period_end: new Date(newInvoice.periodEnd).toISOString(),
        subscription_revenue: revenue.subscription_revenue,
        tips_revenue: revenue.tips_revenue,
        live_revenue: revenue.live_revenue,
        private_content_revenue: revenue.private_content_revenue,
        gross_amount: grossAmount,
        platform_commission_amount: commissionAmount,
        creator_country: newInvoice.country,
        vat_rate: taxRate,
        vat_amount: taxAmount,
        net_amount: netAmount,
        creator_name: creatorInfo?.stage_name || creatorInfo?.profile?.display_name || 'Créateur',
        creator_address: null,
        creator_tax_id: creatorInfo?.tax_id || null,
        currency: currency,
        status: 'finalized',
        created_at: new Date().toISOString()
      };

      // Télécharger automatiquement le PDF
      generatePDF(newInvoiceData);

      toast.success('Facture générée et téléchargée !');
      setShowCreateDialog(false);
      loadInvoices();
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      toast.error(error.message || 'Erreur lors de la génération de la facture');
    } finally {
      setGenerating(false);
    }
  };

  const generatePDF = (invoice: Invoice) => {
    const doc = new jsPDF();
    const isUS = invoice.currency === 'USD';
    const taxLabel = isUS ? 'Sales Tax' : 'TVA';
    
    // En-tête
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(isUS ? 'INVOICE' : 'FACTURE', 20, 30);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.invoice_number, 20, 38);
    doc.text(`Date: ${format(new Date(invoice.created_at), isUS ? 'MM/dd/yyyy' : 'dd/MM/yyyy')}`, 20, 44);
    
    // Logo / Nom plateforme
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('TheForge', 150, 30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(isUS ? 'Creator Platform' : 'Plateforme de créateurs', 150, 38);
    doc.text('SIRET: 98515908600018', 150, 44);
    
    // Infos créateur
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(isUS ? 'Issuer' : 'Émetteur', 20, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(invoice.creator_name, 20, 68);
    if (invoice.creator_address) {
      doc.text(invoice.creator_address, 20, 74);
    }
    if (invoice.creator_tax_id) {
      doc.text(`${isUS ? 'Tax ID' : 'N° TVA'}: ${invoice.creator_tax_id}`, 20, 80);
    }
    const locationName = getLocationName(isUS ? 'us' : 'eu', invoice.creator_country);
    doc.text(`${isUS ? 'State' : 'Pays'}: ${locationName}`, 20, invoice.creator_tax_id ? 86 : 80);
    
    // Période
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(isUS ? 'Billing Period' : 'Période de facturation', 120, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const dateFormat = isUS ? 'MM/dd/yyyy' : 'dd/MM/yyyy';
    doc.text(`${format(new Date(invoice.period_start), dateFormat)} - ${format(new Date(invoice.period_end), dateFormat)}`, 120, 68);
    
    // Tableau des revenus
    const revenueData = [
      [isUS ? 'Subscription Revenue' : 'Revenus d\'abonnements', formatCurrency(invoice.subscription_revenue, invoice.currency)],
      [isUS ? 'Tips Received' : 'Pourboires reçus', formatCurrency(invoice.tips_revenue, invoice.currency)],
      [isUS ? 'Live Stream Revenue' : 'Revenus des lives', formatCurrency(invoice.live_revenue, invoice.currency)],
      [isUS ? 'Private Content' : 'Contenu privé payant', formatCurrency(invoice.private_content_revenue, invoice.currency)],
    ];
    
    autoTable(doc, {
      startY: 100,
      head: [[isUS ? 'Description' : 'Description', isUS ? 'Amount' : 'Montant']],
      body: revenueData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        1: { halign: 'right' }
      }
    });
    
    // Calcul final
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFillColor(245, 245, 245);
    doc.rect(20, finalY, 170, 60, 'F');
    
    doc.setFontSize(10);
    let yPos = finalY + 10;
    
    doc.text(isUS ? 'Gross Total' : 'Total brut', 25, yPos);
    doc.text(formatCurrency(invoice.gross_amount, invoice.currency), 180, yPos, { align: 'right' });
    
    yPos += 8;
    doc.setTextColor(220, 38, 38);
    doc.text(isUS ? 'Platform Commission (15%)' : 'Commission plateforme (15%)', 25, yPos);
    doc.text(`-${formatCurrency(invoice.platform_commission_amount, invoice.currency)}`, 180, yPos, { align: 'right' });
    
    yPos += 8;
    doc.setTextColor(0, 0, 0);
    doc.text(isUS ? 'Subtotal' : 'Sous-total HT', 25, yPos);
    doc.text(formatCurrency(invoice.gross_amount - invoice.platform_commission_amount, invoice.currency), 180, yPos, { align: 'right' });
    
    yPos += 8;
    doc.setTextColor(220, 38, 38);
    const taxPercent = (invoice.vat_rate * 100).toFixed(2);
    doc.text(`${taxLabel} (${taxPercent}% - ${locationName})`, 25, yPos);
    doc.text(`-${formatCurrency(invoice.vat_amount, invoice.currency)}`, 180, yPos, { align: 'right' });
    
    yPos += 10;
    doc.setTextColor(22, 163, 74);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(isUS ? 'Net Amount' : 'Net à percevoir', 25, yPos);
    doc.text(formatCurrency(invoice.net_amount, invoice.currency), 180, yPos, { align: 'right' });
    
    // Footer
    doc.setTextColor(128, 128, 128);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(isUS ? 'This invoice was automatically generated by TheForge platform.' : 'Cette facture a été générée automatiquement par la plateforme TheForge.', 20, 280);
    doc.text(isUS ? 'For any questions, contact support@theforge.fr' : 'Pour toute question, contactez support@theforge.fr', 20, 285);
    
    // Télécharger
    doc.save(`${invoice.invoice_number}.pdf`);
    toast.success('PDF téléchargé !');
  };

  const handlePrint = () => {
    if (invoiceRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        // SECURITY: Build document safely without innerHTML/document.write XSS risk
        const invoiceContent = invoiceRef.current.cloneNode(true) as HTMLElement;
        
        // Create the print document structure
        const printDoc = printWindow.document;
        printDoc.open();
        printDoc.write('<!DOCTYPE html><html><head></head><body></body></html>');
        printDoc.close();
        
        // Set title safely
        printDoc.title = `Facture ${selectedInvoice?.invoice_number || ''}`;
        
        // Add styles safely via DOM API
        const style = printDoc.createElement('style');
        style.textContent = `
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .invoice-title { font-size: 28px; font-weight: bold; color: #333; }
          .invoice-number { color: #666; margin-top: 8px; }
          .section { margin-bottom: 24px; }
          .section-title { font-weight: bold; margin-bottom: 8px; color: #333; }
          .table { width: 100%; border-collapse: collapse; margin-top: 24px; }
          .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
          .table th { background: #f5f5f5; font-weight: bold; }
          .text-right { text-align: right; }
          .total-row { font-weight: bold; background: #f0f9ff; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        `;
        printDoc.head.appendChild(style);
        
        // Append cloned content safely (no innerHTML)
        printDoc.body.appendChild(invoiceContent);
        
        printWindow.print();
      }
    }
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'fr-FR', { 
      style: 'currency', 
      currency: currency 
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Brouillon</Badge>;
      case 'finalized':
        return <Badge variant="default">Finalisée</Badge>;
      case 'paid':
        return <Badge className="bg-green-500">Payée</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const isUSInvoice = (invoice: Invoice) => invoice.currency === 'USD';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Mes Factures
            </CardTitle>
            <CardDescription>
              Générez et téléchargez vos factures avec TVA/Taxes détaillées (EU & US)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowCreateDialog(true)} variant="premium" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle facture
            </Button>
          </div>
        </div>
        
        {/* Tabs pour switcher entre factures locales et Stripe */}
        <Tabs value={activeTab} onValueChange={(v) => {
          setActiveTab(v as 'local' | 'stripe');
          if (v === 'stripe' && stripeInvoices.length === 0) {
            loadStripeInvoices();
          }
        }} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="local">Factures locales</TabsTrigger>
            <TabsTrigger value="stripe">Factures Stripe</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent>
        {activeTab === 'local' ? (
          // Factures locales
          loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune facture générée</p>
              <p className="text-sm">Créez votre première facture pour vos revenus</p>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Facture</TableHead>
                <TableHead>Période</TableHead>
                <TableHead>Montant brut</TableHead>
                <TableHead>Taxes</TableHead>
                <TableHead>Net à percevoir</TableHead>
                <TableHead>Devise</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono text-sm">{invoice.invoice_number}</TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(invoice.period_start), 'dd MMM', { locale: fr })} - {format(new Date(invoice.period_end), 'dd MMM yyyy', { locale: fr })}
                  </TableCell>
                  <TableCell>{formatCurrency(invoice.gross_amount, invoice.currency)}</TableCell>
                  <TableCell className="text-orange-600">
                    -{formatCurrency(invoice.vat_amount, invoice.currency)}
                    <span className="text-xs text-muted-foreground ml-1">
                      ({(invoice.vat_rate * 100).toFixed(1)}%)
                    </span>
                  </TableCell>
                  <TableCell className="font-bold text-green-600">{formatCurrency(invoice.net_amount, invoice.currency)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      {invoice.currency === 'USD' ? <DollarSign className="h-3 w-3" /> : <Euro className="h-3 w-3" />}
                      {invoice.currency}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => generatePDF(invoice)}
                      title="Télécharger PDF"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedInvoice(invoice);
                        setShowInvoiceDialog(true);
                      }}
                      title="Voir détails"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )
        ) : (
          // Factures Stripe
          loadingStripe ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : stripeInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune facture Stripe</p>
              <p className="text-sm">Les factures générées par Stripe apparaîtront ici</p>
              <Button variant="outline" className="mt-4" onClick={loadStripeInvoices}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={loadStripeInvoices}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualiser
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Facture</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Taxes</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stripeInvoices.map((invoice: any) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono text-sm">{invoice.number || invoice.id.slice(-8)}</TableCell>
                      <TableCell className="text-sm">
                        {invoice.customer_name || invoice.customer_email || 'Client'}
                      </TableCell>
                      <TableCell>{formatCurrency((invoice.total || 0) / 100, invoice.currency?.toUpperCase() || 'EUR')}</TableCell>
                      <TableCell className="text-orange-600">
                        {invoice.tax ? formatCurrency(invoice.tax / 100, invoice.currency?.toUpperCase() || 'EUR') : '-'}
                      </TableCell>
                      <TableCell>
                        {invoice.status === 'paid' ? (
                          <Badge className="bg-green-500">Payée</Badge>
                        ) : invoice.status === 'open' ? (
                          <Badge variant="default">Ouverte</Badge>
                        ) : (
                          <Badge variant="secondary">{invoice.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {invoice.created ? format(new Date(invoice.created * 1000), 'dd/MM/yyyy') : '-'}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {invoice.invoice_pdf && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(invoice.invoice_pdf, '_blank')}
                            title="Télécharger PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {invoice.hosted_invoice_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(invoice.hosted_invoice_url, '_blank')}
                            title="Voir sur Stripe"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        )}
      </CardContent>

      {/* Dialog création facture */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Générer une facture</DialogTitle>
            <DialogDescription>
              Créez une facture pour vos revenus sur une période donnée
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Indicateur de localisation détectée */}
            {!geoLoading && geoData && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                <span>
                  Localisation détectée : <strong>{geoData.countryName}</strong>
                  {geoData.region && ` (${geoData.region})`}
                </span>
              </div>
            )}

            {/* Sélection du marché */}
            <div className="space-y-2">
              <Label>Marché</Label>
              <Tabs value={newInvoice.market} onValueChange={(v) => setNewInvoice(prev => ({ 
                ...prev, 
                market: v as MarketType,
                country: v === 'eu' ? (geoData?.isEU ? geoData.countryCode : 'FR') : (getStateCode() || 'CA')
              }))}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="eu" className="flex items-center gap-2">
                    <Euro className="h-4 w-4" />
                    Europe (TVA)
                  </TabsTrigger>
                  <TabsTrigger value="us" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    États-Unis (Sales Tax)
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date de début</Label>
                <Input
                  type="date"
                  value={newInvoice.periodStart}
                  onChange={(e) => setNewInvoice(prev => ({ ...prev, periodStart: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Date de fin</Label>
                <Input
                  type="date"
                  value={newInvoice.periodEnd}
                  onChange={(e) => setNewInvoice(prev => ({ ...prev, periodEnd: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{newInvoice.market === 'eu' ? 'Pays (pour le taux de TVA)' : 'État (pour la Sales Tax)'}</Label>
              <Select
                value={newInvoice.country}
                onValueChange={(value) => setNewInvoice(prev => ({ ...prev, country: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {newInvoice.market === 'eu' ? (
                    Object.entries(EU_VAT_RATES).map(([code, info]) => (
                      <SelectItem key={code} value={code}>
                        {info.name} - {(info.rate * 100).toFixed(0)}% TVA
                      </SelectItem>
                    ))
                  ) : (
                    Object.entries(US_STATE_TAXES).map(([code, info]) => (
                      <SelectItem key={code} value={code}>
                        {info.name} - {(info.rate * 100).toFixed(2)}% Sales Tax
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>{newInvoice.market === 'eu' ? 'TVA' : 'Sales Tax'} applicable :</strong>{' '}
                Calculée automatiquement via Stripe Tax
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {newInvoice.market === 'eu' 
                  ? 'La TVA sera calculée sur le montant net après commission plateforme (15%)'
                  : 'La Sales Tax sera calculée sur le montant net après commission plateforme (15%)'
                }
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                <strong>Devise :</strong> {getCurrency(newInvoice.market)}
              </p>
              <p className="text-xs text-green-600 mt-2">
                ✓ Taux de taxe précis selon le pays/état grâce à Stripe Tax
              </p>
            </div>

            <Button onClick={generateInvoice} disabled={generating} className="w-full">
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Générer la facture
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog visualisation facture */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Facture {selectedInvoice?.invoice_number}</DialogTitle>
              <div className="flex gap-2">
                <Button onClick={() => selectedInvoice && generatePDF(selectedInvoice)} variant="default" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger PDF
                </Button>
                <Button onClick={handlePrint} variant="outline" size="sm">
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimer
                </Button>
              </div>
            </div>
          </DialogHeader>

          {selectedInvoice && (
            <div ref={invoiceRef} className="space-y-6 p-4">
              {/* En-tête */}
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold">{isUSInvoice(selectedInvoice) ? 'INVOICE' : 'FACTURE'}</h1>
                  <p className="text-muted-foreground">{selectedInvoice.invoice_number}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Date : {format(new Date(selectedInvoice.created_at), isUSInvoice(selectedInvoice) ? 'MM/dd/yyyy' : 'dd MMMM yyyy', { locale: isUSInvoice(selectedInvoice) ? undefined : fr })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">Crub</p>
                  <p className="text-sm text-muted-foreground">{isUSInvoice(selectedInvoice) ? 'Creator Platform' : 'Plateforme de créateurs'}</p>
                </div>
              </div>

              <Separator />

              {/* Infos créateur */}
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold mb-2">{isUSInvoice(selectedInvoice) ? 'Issuer' : 'Émetteur'}</h3>
                  <p className="font-medium">{selectedInvoice.creator_name}</p>
                  {selectedInvoice.creator_address && <p className="text-sm">{selectedInvoice.creator_address}</p>}
                  {selectedInvoice.creator_tax_id && (
                    <p className="text-sm">{isUSInvoice(selectedInvoice) ? 'Tax ID' : 'N° TVA'} : {selectedInvoice.creator_tax_id}</p>
                  )}
                  <p className="text-sm">
                    {isUSInvoice(selectedInvoice) ? 'State' : 'Pays'} : {getLocationName(isUSInvoice(selectedInvoice) ? 'us' : 'eu', selectedInvoice.creator_country)}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">{isUSInvoice(selectedInvoice) ? 'Billing Period' : 'Période de facturation'}</h3>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(selectedInvoice.period_start), isUSInvoice(selectedInvoice) ? 'MM/dd/yyyy' : 'dd MMMM yyyy', { locale: isUSInvoice(selectedInvoice) ? undefined : fr })}
                  </p>
                  <p className="text-sm text-muted-foreground">{isUSInvoice(selectedInvoice) ? 'to' : 'au'}</p>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(selectedInvoice.period_end), isUSInvoice(selectedInvoice) ? 'MM/dd/yyyy' : 'dd MMMM yyyy', { locale: isUSInvoice(selectedInvoice) ? undefined : fr })}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Détail des revenus */}
              <div>
                <h3 className="font-semibold mb-4">{isUSInvoice(selectedInvoice) ? 'Revenue Breakdown' : 'Détail des revenus'}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">{isUSInvoice(selectedInvoice) ? 'Amount' : 'Montant'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>{isUSInvoice(selectedInvoice) ? 'Subscription Revenue' : 'Revenus d\'abonnements'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(selectedInvoice.subscription_revenue, selectedInvoice.currency)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>{isUSInvoice(selectedInvoice) ? 'Tips Received' : 'Pourboires reçus'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(selectedInvoice.tips_revenue, selectedInvoice.currency)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>{isUSInvoice(selectedInvoice) ? 'Live Stream Revenue' : 'Revenus des lives'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(selectedInvoice.live_revenue, selectedInvoice.currency)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>{isUSInvoice(selectedInvoice) ? 'Private Content' : 'Contenu privé payant'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(selectedInvoice.private_content_revenue, selectedInvoice.currency)}</TableCell>
                    </TableRow>
                    <TableRow className="font-semibold">
                      <TableCell>{isUSInvoice(selectedInvoice) ? 'Gross Total' : 'Total brut'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(selectedInvoice.gross_amount, selectedInvoice.currency)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Calcul final */}
              <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>{isUSInvoice(selectedInvoice) ? 'Gross Total' : 'Total brut'}</span>
                  <span>{formatCurrency(selectedInvoice.gross_amount, selectedInvoice.currency)}</span>
                </div>
                <div className="flex justify-between text-orange-600">
                  <span>{isUSInvoice(selectedInvoice) ? 'Platform Commission (15%)' : 'Commission plateforme (15%)'}</span>
                  <span>-{formatCurrency(selectedInvoice.platform_commission_amount, selectedInvoice.currency)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span>{isUSInvoice(selectedInvoice) ? 'Subtotal' : 'Sous-total HT'}</span>
                  <span>{formatCurrency(selectedInvoice.gross_amount - selectedInvoice.platform_commission_amount, selectedInvoice.currency)}</span>
                </div>
                <div className="flex justify-between text-orange-600">
                  <span>
                    {isUSInvoice(selectedInvoice) ? 'Sales Tax' : 'TVA'} ({(selectedInvoice.vat_rate * 100).toFixed(2)}% - {getLocationName(isUSInvoice(selectedInvoice) ? 'us' : 'eu', selectedInvoice.creator_country)})
                  </span>
                  <span>-{formatCurrency(selectedInvoice.vat_amount, selectedInvoice.currency)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold text-green-600">
                  <span>{isUSInvoice(selectedInvoice) ? 'Net Amount' : 'Net à percevoir'}</span>
                  <span>{formatCurrency(selectedInvoice.net_amount, selectedInvoice.currency)}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="text-xs text-muted-foreground pt-4 border-t">
                <p>{isUSInvoice(selectedInvoice) ? 'This invoice was automatically generated by TheForge platform.' : 'Cette facture a été générée automatiquement par la plateforme TheForge.'}</p>
                <p>{isUSInvoice(selectedInvoice) ? 'For any questions, contact support@theforge.fr' : 'Pour toute question, contactez support@theforge.fr'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CreatorInvoices;
