import { CurrencyPipe, isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import {
  CargoDataService,
  DealerClientItem,
  DealerQuoteItem,
  InvoiceItem,
  ShipmentRecord,
} from '../../services/cargo-data.service';

export type DealerModuleTab =
  | 'overview'
  | 'clients'
  | 'quotations'
  | 'margins'
  | 'shipments'
  | 'financials'
  | 'reports'
  | 'profile';

export type DealerReportKind =
  | 'client_performance'
  | 'quotation_conversion'
  | 'shipments'
  | 'revenue'
  | 'margins'
  | 'outstanding_payments';

@Component({
  selector: 'app-dealer-console',
  imports: [CurrencyPipe, FormsModule],
  templateUrl: './dealer-console.html',
  styleUrl: './dealer-console.css',
})
export class DealerConsole {
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly auth = inject(AuthService);
  protected readonly cargoData = inject(CargoDataService);

  readonly activeModule = signal<DealerModuleTab>('overview');
  readonly toastMessage = signal<string | null>(null);
  readonly toastIsError = signal<boolean>(false);
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  protected readonly moduleTabs: ReadonlyArray<{ id: DealerModuleTab; label: string }> = [
    { id: 'overview', label: 'A. Overview' },
    { id: 'clients', label: 'B. Clients' },
    { id: 'quotations', label: 'C. Broker Quotes' },
    { id: 'margins', label: 'D. Client Margins' },
    { id: 'shipments', label: 'E. Shipments' },
    { id: 'financials', label: 'F. Financials' },
    { id: 'reports', label: 'G. Reports' },
    { id: 'profile', label: 'H. Dealer Profile' },
  ];

  protected readonly user = this.auth.currentUser;
  protected readonly ports = this.cargoData.livePorts;
  protected readonly containerSpecs = this.cargoData.containerSpecs;
  protected readonly clients = this.cargoData.dealerClients;
  protected readonly quotes = this.cargoData.dealerQuotes;
  protected readonly shipments = this.cargoData.liveShipments;
  protected readonly invoices = this.cargoData.invoices;
  protected readonly activityFeed = this.cargoData.activityFeed;

  // Admin-defined permitted margin limits (read-only for Dealer)
  protected readonly minMargin = computed(
    () => this.cargoData.systemConfig().dealerMinMarginPercent ?? 2.0,
  );
  protected readonly maxMargin = computed(
    () => this.cargoData.systemConfig().dealerMaxMarginPercent ?? 18.0,
  );

  // A. Dealer Overview KPIs
  protected readonly activeClients = computed(() =>
    this.clients().filter((c) => c.accountStatus === 'Active'),
  );
  protected readonly approvedQuotes = computed(() =>
    this.quotes().filter((q) => q.status === 'Approved' || q.status === 'Dispatched'),
  );
  protected readonly pendingQuotes = computed(() =>
    this.quotes().filter((q) => q.status === 'Pending Review'),
  );
  protected readonly rejectedQuotes = computed(() =>
    this.quotes().filter((q) => q.status === 'Rejected'),
  );
  protected readonly activeShipments = computed(() =>
    this.shipments().filter((s) => s.status !== 'Delivered'),
  );
  protected readonly completedShipments = computed(() =>
    this.shipments().filter((s) => s.status === 'Delivered'),
  );
  protected readonly paidInvoices = computed(() =>
    this.invoices().filter((i) => i.status === 'Paid'),
  );
  protected readonly dueInvoices = computed(() =>
    this.invoices().filter((i) => i.status === 'Due'),
  );
  protected readonly totalTransactionsUsd = computed(() =>
    this.invoices().reduce((sum, i) => sum + i.amountUsd, 0),
  );
  protected readonly collectedPaymentsUsd = computed(() =>
    this.paidInvoices().reduce((sum, i) => sum + i.amountUsd, 0),
  );
  protected readonly outstandingPaymentsUsd = computed(() =>
    this.dueInvoices().reduce((sum, i) => sum + i.amountUsd, 0),
  );

  // B. Client Management state
  protected readonly clientSearch = signal('');
  protected readonly clientStatusFilter = signal<'All' | DealerClientItem['accountStatus']>('All');
  protected readonly showClientForm = signal(false);
  protected readonly newClientCompany = signal('');
  protected readonly newClientContact = signal('');
  protected readonly newClientEmail = signal('');
  protected readonly newClientPhone = signal('');
  protected readonly newClientCountry = signal('');
  protected readonly newClientHub = signal('NLRTM');
  protected readonly newClientMargin = signal(8.5);
  protected readonly newClientNotes = signal('');

  protected readonly selectedClient = signal<DealerClientItem | null>(null);
  protected readonly editingClient = signal<DealerClientItem | null>(null);
  protected readonly editClientCompany = signal('');
  protected readonly editClientContact = signal('');
  protected readonly editClientEmail = signal('');
  protected readonly editClientPhone = signal('');
  protected readonly editClientCountry = signal('');
  protected readonly editClientHub = signal('NLRTM');
  protected readonly editClientMargin = signal(8.5);
  protected readonly editClientNotes = signal('');

  protected readonly filteredClients = computed(() => {
    const q = this.clientSearch().trim().toLowerCase();
    const st = this.clientStatusFilter();
    return this.clients().filter((c) => {
      if (st !== 'All' && c.accountStatus !== st) return false;
      if (!q) return true;
      return (
        c.companyName.toLowerCase().includes(q) ||
        c.contactName.toLowerCase().includes(q) ||
        c.contactEmail.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.hubLocode.toLowerCase().includes(q)
      );
    });
  });

  protected readonly selectedClientShipments = computed(() => {
    const client = this.selectedClient();
    if (!client) return [];
    return this.shipments().filter(
      (s) =>
        s.dealerClientId === client.id ||
        (s.cargoDescription ?? '').toLowerCase().includes(client.companyName.toLowerCase()),
    );
  });

  protected readonly selectedClientQuotes = computed(() => {
    const client = this.selectedClient();
    if (!client) return [];
    return this.quotes().filter(
      (q) =>
        q.clientId === client.id ||
        q.client.toLowerCase() === client.companyName.toLowerCase(),
    );
  });

  protected readonly selectedClientInvoices = computed(() => {
    const client = this.selectedClient();
    if (!client) return [];
    const shipIds = new Set(this.selectedClientShipments().map((s) => s.trackingId));
    return this.invoices().filter(
      (inv) =>
        inv.dealerClientId === client.id ||
        (inv.clientName ?? '').toLowerCase() === client.companyName.toLowerCase() ||
        shipIds.has(inv.shipmentId),
    );
  });

  // C. Broker Quotations state
  protected readonly quoteStatusFilter = signal<
    'All' | 'Pending Review' | 'Approved' | 'Rejected' | 'Dispatched'
  >('All');
  protected readonly showBrokerQuoteForm = signal(false);
  protected readonly quoteClientId = signal('');
  protected readonly quoteManualCompany = signal('');
  protected readonly quoteManualEmail = signal('');
  protected readonly quoteOriginCode = signal('CNSHA');
  protected readonly quoteDestCode = signal('NLRTM');
  protected readonly quoteContainerId = signal('40-hc');
  protected readonly quoteQuantity = signal(2);
  protected readonly quoteCargoSpecs = signal('40ft High-Cube · Palletized Machinery · 24,500 kg');
  protected readonly quoteMarginPercent = signal(8.5);
  protected readonly quoteNotes = signal('');

  protected readonly brokerQuoteBaseCalc = computed(() =>
    this.cargoData.calculateFreightQuote(
      this.quoteOriginCode(),
      this.quoteDestCode(),
      this.quoteContainerId(),
      this.quoteQuantity(),
    ),
  );

  protected readonly brokerQuoteFinalTotal = computed(() => {
    const base = this.brokerQuoteBaseCalc()?.totalUsd ?? 0;
    const margin = Number(this.quoteMarginPercent()) || 0;
    return Math.round(base * (1 + margin / 100));
  });

  protected readonly laneRateComparison = computed(() =>
    this.cargoData.compareLaneRates(
      this.quoteOriginCode(),
      this.quoteDestCode(),
      this.quoteQuantity(),
    ),
  );

  protected readonly filteredQuotes = computed(() => {
    const st = this.quoteStatusFilter();
    return this.quotes().filter((q) => st === 'All' || q.status === st);
  });

  // D. Client Margin Management state
  protected readonly marginClientId = signal('');
  protected readonly marginOriginCode = signal('CNSHA');
  protected readonly marginDestCode = signal('NLRTM');
  protected readonly marginContainerId = signal('40-hc');
  protected readonly marginQuantity = signal(2);
  protected readonly marginInputPercent = signal(8.5);
  protected readonly marginCargoSpecs = signal('Standard Commercial FCL');
  protected readonly clientMarginDrafts = signal<Record<string, number>>({});

  protected readonly marginBaseQuote = computed(() =>
    this.cargoData.calculateFreightQuote(
      this.marginOriginCode(),
      this.marginDestCode(),
      this.marginContainerId(),
      this.marginQuantity(),
    ),
  );

  protected readonly marginProfitUsd = computed(() => {
    const base = this.marginBaseQuote()?.totalUsd ?? 0;
    const pct = Number(this.marginInputPercent()) || 0;
    return Math.round((base * pct) / 100);
  });

  protected readonly marginFinalClientUsd = computed(() => {
    const base = this.marginBaseQuote()?.totalUsd ?? 0;
    return base + this.marginProfitUsd();
  });

  protected readonly averageQuoteMargin = computed(() => {
    const list = this.quotes();
    if (list.length === 0) return '0.0';
    const avg = list.reduce((sum, q) => sum + q.marginPercent, 0) / list.length;
    return avg.toFixed(1);
  });

  protected readonly totalProjectedMarginProfitUsd = computed(() =>
    this.quotes()
      .filter((q) => q.status !== 'Rejected')
      .reduce((sum, q) => {
        const base = q.baseRateUsd ?? Math.round(q.rateUsd / (1 + q.marginPercent / 100));
        return sum + Math.max(0, q.rateUsd - base);
      }, 0),
  );

  // E. Shipment Management state
  protected readonly showClientShipmentForm = signal(false);
  protected readonly shipClientId = signal('');
  protected readonly shipOriginCode = signal('CNSHA');
  protected readonly shipDestCode = signal('NLRTM');
  protected readonly shipContainerId = signal('40-hc');
  protected readonly shipQuantity = signal(1);
  protected readonly shipCargoDesc = signal('Industrial Equipment & Components');
  protected readonly shipIncoterm = signal<'EXW' | 'FOB' | 'CIF' | 'DDP'>('CIF');
  protected readonly shipmentSearch = signal('');
  protected readonly shipmentStatusFilter = signal<'All' | 'Active' | 'Delivered'>('All');
  protected readonly shipmentClientFilter = signal<string>('All');
  protected readonly selectedShipmentId = signal<string>('');
  protected readonly dismissedNotifications = signal<Record<string, boolean>>({});

  protected readonly shipPreviewRate = computed(() =>
    this.cargoData.calculateFreightQuote(
      this.shipOriginCode(),
      this.shipDestCode(),
      this.shipContainerId(),
      this.shipQuantity(),
    ),
  );

  protected readonly filteredShipments = computed(() => {
    const q = this.shipmentSearch().trim().toLowerCase();
    const st = this.shipmentStatusFilter();
    const cid = this.shipmentClientFilter();
    return this.shipments().filter((s) => {
      if (st === 'Active' && s.status === 'Delivered') return false;
      if (st === 'Delivered' && s.status !== 'Delivered') return false;
      if (cid !== 'All') {
        const clientObj = this.clients().find((c) => c.id === cid);
        const matchesClient =
          s.dealerClientId === cid ||
          (clientObj &&
            (s.cargoDescription ?? '').toLowerCase().includes(clientObj.companyName.toLowerCase()));
        if (!matchesClient) return false;
      }
      if (!q) return true;
      return (
        s.trackingId.toLowerCase().includes(q) ||
        s.containerNumber.toLowerCase().includes(q) ||
        s.vessel.toLowerCase().includes(q) ||
        s.origin.toLowerCase().includes(q) ||
        s.destination.toLowerCase().includes(q)
      );
    });
  });

  protected readonly selectedShipment = computed<ShipmentRecord | undefined>(
    () =>
      this.shipments().find((s) => s.trackingId === this.selectedShipmentId()) ??
      this.filteredShipments()[0],
  );

  protected readonly shipmentNotifications = computed(() => {
    const dismissed = this.dismissedNotifications();
    const items: Array<{ id: string; tag: string; message: string; severity: 'info' | 'warn' }> = [];
    for (const s of this.shipments()) {
      if (s.isDelayed || s.customsStatus === 'Hold / Inspection') {
        const id = `delay-${s.trackingId}`;
        if (!dismissed[id]) {
          items.push({
            id,
            tag: 'EXCEPTION',
            message: `${s.trackingId} (${s.origin} → ${s.destination}) flagged ${s.customsStatus === 'Hold / Inspection' ? 'Customs Hold' : 'Delayed'}${s.disputeNote ? ': ' + s.disputeNote : ''}.`,
            severity: 'warn',
          });
        }
      }
    }
    for (const evt of this.activityFeed()) {
      if (!dismissed[evt.id]) {
        items.push({
          id: evt.id,
          tag: evt.tag,
          message: `${evt.message} (${evt.timestamp})`,
          severity: 'info',
        });
      }
    }
    return items.slice(0, 6);
  });

  // F. Invoices & Financials state
  protected readonly invoiceShipmentId = signal('');
  protected readonly paymentMethodChoice = signal('Corporate Wire / ACH');
  protected readonly invoiceStatusFilter = signal<'All' | 'Due' | 'Paid'>('All');

  protected readonly canIssueBillingDocs = computed(() => {
    const u = this.user();
    if (!u) return false;
    return u.approvalStatus !== 'rejected' && u.approvalStatus !== 'pending';
  });

  protected readonly filteredInvoices = computed(() => {
    const st = this.invoiceStatusFilter();
    return this.invoices().filter((i) => st === 'All' || i.status === st);
  });

  // G. Reports & Analytics state
  protected readonly selectedReport = signal<DealerReportKind>('client_performance');

  protected readonly clientPerformanceRows = computed(() =>
    this.clients().map((c) => {
      const clientShips = this.shipments().filter(
        (s) =>
          s.dealerClientId === c.id ||
          (s.cargoDescription ?? '').toLowerCase().includes(c.companyName.toLowerCase()),
      );
      const clientQuotes = this.quotes().filter(
        (q) => q.clientId === c.id || q.client.toLowerCase() === c.companyName.toLowerCase(),
      );
      const volumeUsd = clientShips.reduce((sum, s) => sum + (s.freightChargeUsd ?? 0), 0);
      return {
        client: c,
        shipmentsCount: clientShips.length,
        quotesCount: clientQuotes.length,
        volumeUsd,
      };
    }),
  );

  protected readonly quotationConversionStats = computed(() => {
    const total = this.quotes().length;
    const approved = this.approvedQuotes().length;
    const pending = this.pendingQuotes().length;
    const rejected = this.rejectedQuotes().length;
    const rate = total > 0 ? Math.round((approved / total) * 100) : 0;
    return { total, approved, pending, rejected, rate };
  });

  // H. Dealer Profile state
  protected readonly profileName = signal(this.auth.currentUser()?.name ?? '');
  protected readonly profileOrg = signal(this.auth.currentUser()?.organization ?? '');
  protected readonly profileHub = signal(this.auth.currentUser()?.hub ?? 'NLRTM');
  protected readonly profilePhone = signal(this.auth.currentUser()?.phone ?? '');
  protected readonly profileRegNumber = signal(
    this.auth.currentUser()?.businessRegNumber ?? '',
  );
  protected readonly profileTaxId = signal(this.auth.currentUser()?.taxId ?? '');
  protected readonly profileAddress = signal(this.auth.currentUser()?.businessAddress ?? '');
  protected readonly verificationDocName = signal(
    this.auth.currentUser()?.verificationDocName ?? '',
  );
  protected readonly verificationDocRef = signal(
    this.auth.currentUser()?.verificationDocUrl ?? '',
  );
  protected readonly newPassword = signal('');
  protected readonly confirmPassword = signal('');

  // --- Client Actions (Module B) ---
  protected async handleRegisterClient(): Promise<void> {
    if (
      !this.newClientCompany().trim() ||
      !this.newClientContact().trim() ||
      !this.newClientEmail().trim()
    ) {
      this.flash('Enter company name, contact name, and email.', true);
      return;
    }

    const res = await this.cargoData.registerDealerClient({
      companyName: this.newClientCompany(),
      contactName: this.newClientContact(),
      contactEmail: this.newClientEmail(),
      contactPhone: this.newClientPhone(),
      country: this.newClientCountry(),
      hubLocode: this.newClientHub(),
      customMarginPercent: Number(this.newClientMargin()),
      notes: this.newClientNotes(),
    });

    if (!res.ok) {
      this.flash(res.error ?? 'Failed to register client.', true);
      return;
    }

    this.newClientCompany.set('');
    this.newClientContact.set('');
    this.newClientEmail.set('');
    this.newClientPhone.set('');
    this.newClientCountry.set('');
    this.newClientNotes.set('');
    this.showClientForm.set(false);
    this.flash(`Registered client ${res.clientItem?.companyName ?? ''}.`);
  }

  protected openClientEditor(clientItem: DealerClientItem): void {
    this.editingClient.set(clientItem);
    this.editClientCompany.set(clientItem.companyName);
    this.editClientContact.set(clientItem.contactName);
    this.editClientEmail.set(clientItem.contactEmail);
    this.editClientPhone.set(clientItem.contactPhone);
    this.editClientCountry.set(clientItem.country);
    this.editClientHub.set(clientItem.hubLocode);
    this.editClientMargin.set(clientItem.customMarginPercent);
    this.editClientNotes.set(clientItem.notes);
  }

  protected async saveClientEditor(): Promise<void> {
    const target = this.editingClient();
    if (!target) return;

    const res = await this.cargoData.updateDealerClient(target.id, {
      companyName: this.editClientCompany(),
      contactName: this.editClientContact(),
      contactEmail: this.editClientEmail(),
      contactPhone: this.editClientPhone(),
      country: this.editClientCountry(),
      hubLocode: this.editClientHub(),
      customMarginPercent: Number(this.editClientMargin()),
      notes: this.editClientNotes(),
      lastActivity: 'Updated client contact & account profile',
    });

    if (!res.ok) {
      this.flash(res.error ?? 'Could not update client.', true);
      return;
    }

    if (this.selectedClient()?.id === target.id) {
      const updated = this.clients().find((c) => c.id === target.id) ?? null;
      this.selectedClient.set(updated);
    }
    this.editingClient.set(null);
    this.flash(`Updated profile for ${this.editClientCompany()}.`);
  }

  protected async setClientStatus(
    clientItem: DealerClientItem,
    status: DealerClientItem['accountStatus'],
  ): Promise<void> {
    const res = await this.cargoData.updateDealerClient(clientItem.id, {
      accountStatus: status,
      lastActivity: `Account status changed to ${status}`,
    });
    this.flash(
      res.ok ? `${clientItem.companyName} set to ${status}.` : (res.error ?? 'Status update failed.'),
      !res.ok,
    );
  }

  // --- Broker Quote & Margin Actions (Modules C & D) ---
  protected onQuoteClientSelected(clientId: string): void {
    this.quoteClientId.set(clientId);
    const found = this.clients().find((c) => c.id === clientId);
    if (found) {
      this.quoteMarginPercent.set(found.customMarginPercent);
    }
  }

  protected onMarginClientSelected(clientId: string): void {
    this.marginClientId.set(clientId);
    const found = this.clients().find((c) => c.id === clientId);
    if (found) {
      this.marginInputPercent.set(found.customMarginPercent);
    }
  }

  protected async handleSubmitBrokerQuote(): Promise<void> {
    const selected = this.clients().find((c) => c.id === this.quoteClientId());
    const clientName = selected?.companyName ?? this.quoteManualCompany().trim();
    const contactEmail = selected?.contactEmail ?? this.quoteManualEmail().trim();

    if (!clientName || !contactEmail) {
      this.flash('Select a registered client or enter company name and contact email.', true);
      return;
    }

    const res = await this.cargoData.submitDealerBrokerQuote({
      clientId: selected?.id ?? null,
      clientName,
      contactEmail,
      originCode: this.quoteOriginCode(),
      destinationCode: this.quoteDestCode(),
      containerId: this.quoteContainerId(),
      quantity: Number(this.quoteQuantity()) || 1,
      cargoSpecs: this.quoteCargoSpecs(),
      marginPercent: Number(this.quoteMarginPercent()),
      quoteType: 'broker_request',
      notes: this.quoteNotes(),
    });

    if (!res.ok) {
      this.flash(res.error ?? 'Broker quote request failed.', true);
      return;
    }

    this.quoteManualCompany.set('');
    this.quoteManualEmail.set('');
    this.quoteNotes.set('');
    this.showBrokerQuoteForm.set(false);
    this.flash(`Submitted broker quote request ${res.quoteRef}.`);
  }

  protected clientDraftMargin(clientItem: DealerClientItem): number {
    return this.clientMarginDrafts()[clientItem.id] ?? clientItem.customMarginPercent;
  }

  protected setClientDraftMargin(clientId: string, val: number): void {
    this.clientMarginDrafts.update((map) => ({ ...map, [clientId]: Number(val) }));
  }

  protected async saveClientMargin(clientItem: DealerClientItem): Promise<void> {
    const val = this.clientDraftMargin(clientItem);
    const res = await this.cargoData.updateDealerClient(clientItem.id, {
      customMarginPercent: val,
      lastActivity: `Client markup configured at ${val}%`,
    });
    this.flash(
      res.ok
        ? `Saved ${val}% markup for ${clientItem.companyName}.`
        : (res.error ?? 'Margin outside Admin limits.'),
      !res.ok,
    );
  }

  protected async handleGenerateClientQuote(): Promise<void> {
    const clientItem = this.clients().find((c) => c.id === this.marginClientId());
    if (!clientItem) {
      this.flash('Select a registered client to generate a client-specific quotation.', true);
      return;
    }

    const res = await this.cargoData.submitDealerBrokerQuote({
      clientId: clientItem.id,
      clientName: clientItem.companyName,
      contactEmail: clientItem.contactEmail,
      originCode: this.marginOriginCode(),
      destinationCode: this.marginDestCode(),
      containerId: this.marginContainerId(),
      quantity: Number(this.marginQuantity()) || 1,
      cargoSpecs: this.marginCargoSpecs(),
      marginPercent: Number(this.marginInputPercent()),
      quoteType: 'client_quote',
      notes: `Client-specific margin quote (${this.marginInputPercent()}% markup)`,
    });

    if (!res.ok) {
      this.flash(res.error ?? 'Could not generate client quotation.', true);
      return;
    }
    this.flash(`Generated client quotation ${res.quoteRef} for ${clientItem.companyName}.`);
  }

  protected async handleDispatchQuote(quote: DealerQuoteItem): Promise<void> {
    const res = await this.cargoData.setQuoteDecision(quote.id, 'Dispatched');
    this.flash(
      res.ok ? `Quotation ${quote.id} marked Dispatched.` : (res.error ?? 'Update failed.'),
      !res.ok,
    );
  }

  protected downloadQuoteDocument(quote: DealerQuoteItem): void {
    const baseRate = quote.baseRateUsd ?? Math.round(quote.rateUsd / (1 + quote.marginPercent / 100));
    const marginUsd = Math.max(0, quote.rateUsd - baseRate);
    const text = [
      'TERMINUS MARITIME INFRASTRUCTURE — BROKER & CLIENT QUOTATION',
      '==============================================================',
      `Quotation Ref   : ${quote.id}`,
      `Type            : ${quote.quoteType === 'client_quote' ? 'Client-Specific Quotation' : 'Broker Quote Request'}`,
      `Status          : ${quote.status}`,
      `Broker / Dealer : ${this.user()?.organization ?? 'Partner Dealer'} (${this.user()?.name ?? ''})`,
      `Client          : ${quote.client}`,
      `Contact Email   : ${quote.contactEmail ?? 'N/A'}`,
      `Trade Lane      : ${quote.lane}`,
      `Equipment       : ${quote.equipment}`,
      `Cargo Specs     : ${quote.cargoSpecs || 'Standard Commercial Freight'}`,
      '--------------------------------------------------------------',
      `Base Rate (Locked) : $${baseRate.toLocaleString('en-US')} USD`,
      `Applied Margin     : ${quote.marginPercent}% ($${marginUsd.toLocaleString('en-US')} USD)`,
      `Final Client Rate  : $${quote.rateUsd.toLocaleString('en-US')} USD`,
      '--------------------------------------------------------------',
      `Notes           : ${quote.notes || 'Valid for 14 days subject to vessel space allocation.'}`,
    ].join('\n');

    this.triggerTextDownload(`Quote_${quote.id}.txt`, text);
    this.flash(`Downloaded quotation document ${quote.id}.`);
  }

  // --- Shipment Actions (Module E) ---
  protected async handleCreateClientShipment(): Promise<void> {
    const clientItem = this.clients().find((c) => c.id === this.shipClientId());
    if (!clientItem) {
      this.flash('Select a registered client before creating a shipment.', true);
      return;
    }

    const res = await this.cargoData.createDealerClientShipment({
      client: clientItem,
      originCode: this.shipOriginCode(),
      destinationCode: this.shipDestCode(),
      containerId: this.shipContainerId(),
      quantity: Number(this.shipQuantity()) || 1,
      cargoDescription: this.shipCargoDesc(),
      incoterm: this.shipIncoterm(),
    });

    if (!res.ok || !res.shipment) {
      this.flash(res.error ?? 'Failed to create client shipment.', true);
      return;
    }

    this.selectedShipmentId.set(res.shipment.trackingId);
    this.showClientShipmentForm.set(false);
    this.flash(
      `Created shipment ${res.shipment.trackingId} for ${clientItem.companyName}.`,
    );
  }

  protected dismissNotification(id: string): void {
    this.dismissedNotifications.update((map) => ({ ...map, [id]: true }));
  }

  protected exportBillOfLading(shipment: ShipmentRecord): void {
    const content = [
      'TERMINUS MARITIME INFRASTRUCTURE — DIGITAL BILL OF LADING',
      '=========================================================',
      `B/L Reference   : ${shipment.trackingId}`,
      `Container (ISO) : ${shipment.containerNumber}`,
      `Seal Number     : ${shipment.sealNumber ?? 'SL-904182'}`,
      `Vessel & IMO    : ${shipment.vessel}`,
      `Voyage          : ${shipment.voyage ?? 'V.264W'}`,
      `Origin Port     : ${shipment.origin}`,
      `Destination     : ${shipment.destination}`,
      `Incoterm 2020   : ${shipment.incoterm ?? 'CIF'}`,
      `VGM Weight      : ${shipment.vgmKg ?? 24800} kg`,
      `Equipment       : ${shipment.cargoType} (${shipment.teu})`,
      `Status          : ${shipment.status} (${shipment.progressPercent}%)`,
      `Estimated ETA   : ${shipment.eta}`,
      `Last Free Day   : ${shipment.lastFreeDay ?? 'N/A'}`,
      '',
      'MILESTONE TELEMETRY:',
      ...shipment.milestones.map(
        (m, i) => `  ${i + 1}. [${m.completed ? 'DONE' : 'PEND'}] ${m.timestamp} | ${m.location} — ${m.event}`,
      ),
    ].join('\n');

    this.triggerTextDownload(`BL_${shipment.trackingId}.txt`, content);
    this.flash(`Exported Bill of Lading for ${shipment.trackingId}.`);
  }

  // --- Financial Actions (Module F) ---
  protected async handleIssueClientInvoice(): Promise<void> {
    if (!this.canIssueBillingDocs()) {
      this.flash('Only approved dealers can generate client billing documents.', true);
      return;
    }
    const targetId = this.invoiceShipmentId() || this.shipments()[0]?.trackingId;
    const ship = this.shipments().find((s) => s.trackingId === targetId);
    if (!ship) {
      this.flash('Select a client shipment to generate an invoice.', true);
      return;
    }

    const clientItem =
      this.clients().find(
        (c) =>
          c.id === ship.dealerClientId ||
          (ship.cargoDescription ?? '').toLowerCase().includes(c.companyName.toLowerCase()),
      ) ?? null;

    const res = await this.cargoData.issueDealerClientInvoice(ship, clientItem);
    if (!res.ok || !res.invoice) {
      this.flash(res.error ?? 'Could not issue client invoice.', true);
      return;
    }
    this.flash(`Generated client invoice ${res.invoice.id} ($${res.invoice.amountUsd.toLocaleString('en-US')}).`);
  }

  protected async handleRecordClientPayment(inv: InvoiceItem): Promise<void> {
    const res = await this.cargoData.payInvoice(inv.id, this.paymentMethodChoice());
    this.flash(
      res.ok
        ? `Recorded payment for ${inv.id} (${res.receiptNumber ?? 'Settled'}).`
        : (res.error ?? 'Payment recording failed.'),
      !res.ok,
    );
  }

  protected downloadBillingDocument(inv: InvoiceItem): void {
    const content = [
      'TERMINUS PARTNER BILLING STATEMENT / CLIENT INVOICE',
      '===================================================',
      `Invoice Number  : ${inv.id}`,
      `Dealer Partner  : ${this.user()?.organization ?? 'Terminus Dealer'}`,
      `Client          : ${inv.clientName || 'Assigned Portfolio Client'}`,
      `Shipment Ref    : ${inv.shipmentId}`,
      `Trade Corridor  : ${inv.lane}`,
      `Amount (USD)    : $${inv.amountUsd.toLocaleString('en-US')}`,
      `Due Date        : ${inv.dueDate}`,
      `Status          : ${inv.status}`,
      `Payment Method  : ${inv.paymentMethod ?? 'Pending Settlement'}`,
      `Receipt Ref     : ${inv.receiptNumber ?? 'N/A'}`,
    ].join('\n');

    this.triggerTextDownload(`Invoice_${inv.id}.txt`, content);
    this.flash(`Downloaded billing document ${inv.id}.`);
  }

  protected downloadFinancialStatement(): void {
    const header = ['Invoice', 'Client', 'Shipment', 'Lane', 'AmountUSD', 'DueDate', 'Status', 'PaymentMethod', 'Receipt'];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = this.invoices().map((i) => [
      i.id,
      i.clientName || 'Portfolio Client',
      i.shipmentId,
      i.lane,
      i.amountUsd,
      i.dueDate,
      i.status,
      i.paymentMethod ?? '',
      i.receiptNumber ?? '',
    ]);
    const csv = [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
    this.triggerCsvDownload('terminus-dealer-financial-statement.csv', csv);
    this.flash('Downloaded dealer financial statement CSV.');
  }

  // --- Reports Actions (Module G) ---
  protected downloadDealerReportCsv(kind: DealerReportKind): void {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    let rows: Array<Array<unknown>> = [];

    if (kind === 'client_performance') {
      rows = [
        ['Company', 'Contact', 'Email', 'Hub', 'Status', 'Margin%', 'Shipments', 'Quotes', 'VolumeUSD'],
        ...this.clientPerformanceRows().map((r) => [
          r.client.companyName,
          r.client.contactName,
          r.client.contactEmail,
          r.client.hubLocode,
          r.client.accountStatus,
          r.client.customMarginPercent,
          r.shipmentsCount,
          r.quotesCount,
          r.volumeUsd,
        ]),
      ];
    } else if (kind === 'quotation_conversion') {
      rows = [
        ['QuoteRef', 'Client', 'Type', 'Lane', 'BaseUSD', 'Margin%', 'FinalUSD', 'Status'],
        ...this.quotes().map((q) => [
          q.id,
          q.client,
          q.quoteType ?? 'broker_request',
          q.lane,
          q.baseRateUsd ?? Math.round(q.rateUsd / (1 + q.marginPercent / 100)),
          q.marginPercent,
          q.rateUsd,
          q.status,
        ]),
      ];
    } else if (kind === 'shipments') {
      rows = [
        ['TrackingID', 'Container', 'Origin', 'Destination', 'Status', 'Customs', 'ETA', 'ChargeUSD'],
        ...this.shipments().map((s) => [
          s.trackingId,
          s.containerNumber,
          s.origin,
          s.destination,
          s.status,
          s.customsStatus ?? 'Pending',
          s.eta,
          s.freightChargeUsd ?? 0,
        ]),
      ];
    } else if (kind === 'revenue') {
      rows = [
        ['Invoice', 'Client', 'Shipment', 'Lane', 'AmountUSD', 'Status', 'DueDate'],
        ...this.invoices().map((i) => [
          i.id,
          i.clientName || 'Portfolio Client',
          i.shipmentId,
          i.lane,
          i.amountUsd,
          i.status,
          i.dueDate,
        ]),
      ];
    } else if (kind === 'margins') {
      rows = [
        ['QuoteRef', 'Client', 'BaseUSD', 'Margin%', 'ProfitUSD', 'FinalClientUSD', 'Status'],
        ...this.quotes().map((q) => {
          const base = q.baseRateUsd ?? Math.round(q.rateUsd / (1 + q.marginPercent / 100));
          return [q.id, q.client, base, q.marginPercent, Math.max(0, q.rateUsd - base), q.rateUsd, q.status];
        }),
      ];
    } else {
      rows = [
        ['Invoice', 'Client', 'Shipment', 'Lane', 'OutstandingUSD', 'DueDate'],
        ...this.dueInvoices().map((i) => [
          i.id,
          i.clientName || 'Portfolio Client',
          i.shipmentId,
          i.lane,
          i.amountUsd,
          i.dueDate,
        ]),
      ];
    }

    const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
    this.triggerCsvDownload(`terminus-dealer-${kind}-report.csv`, csv);
    this.flash(`Exported terminus-dealer-${kind}-report.csv`);
  }

  protected printReport(): void {
    if (isPlatformBrowser(this.platformId) && typeof window.print === 'function') {
      window.print();
    }
  }

  // --- Dealer Profile & Security Actions (Module H) ---
  protected onVerificationFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;
    this.verificationDocName.set(file.name);
    if (!this.verificationDocRef().trim()) {
      this.verificationDocRef.set(`doc://${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`);
    }
    this.flash(`Selected verification document "${file.name}". Click Save Business Profile to submit.`);
  }

  protected async handleSaveDealerProfile(): Promise<void> {
    const res = await this.auth.updateDealerProfile({
      name: this.profileName(),
      organization: this.profileOrg(),
      hub: this.profileHub(),
      phone: this.profilePhone(),
      businessRegNumber: this.profileRegNumber(),
      taxId: this.profileTaxId(),
      businessAddress: this.profileAddress(),
      verificationDocName: this.verificationDocName(),
      verificationDocUrl: this.verificationDocRef(),
    });
    this.flash(
      res.ok ? 'Dealer business profile & compliance details saved.' : (res.error ?? 'Save failed.'),
      !res.ok,
    );
  }

  protected async handleUpdatePassword(): Promise<void> {
    if (this.newPassword().trim().length < 8) {
      this.flash('New password must be at least 8 characters.', true);
      return;
    }
    if (this.newPassword() !== this.confirmPassword()) {
      this.flash('Passwords do not match.', true);
      return;
    }
    const res = await this.auth.changeOwnPassword(this.newPassword());
    if (!res.ok) {
      this.flash(res.error ?? 'Password update failed.', true);
      return;
    }
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.flash('Account password updated securely.');
  }

  protected async handleSendPasswordReset(): Promise<void> {
    const email = this.user()?.email ?? '';
    const msg = await this.auth.resetPasswordAsync(email);
    this.flash(msg, /failed/i.test(msg));
  }

  protected quoteProfitUsd(q: DealerQuoteItem): number {
    const base = q.baseRateUsd ?? Math.round(q.rateUsd / (1 + q.marginPercent / 100));
    return Math.max(0, q.rateUsd - base);
  }

  protected quoteBaseUsd(q: DealerQuoteItem): number {
    return q.baseRateUsd ?? Math.round(q.rateUsd / (1 + q.marginPercent / 100));
  }

  protected dismissToast(): void {
    this.toastMessage.set(null);
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
      this.toastTimeout = null;
    }
  }

  private triggerTextDownload(filename: string, content: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private triggerCsvDownload(filename: string, csv: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private flash(msg: string, isError?: boolean): void {
    const inferred =
      isError ?? /(fail|error|could not|invalid|unavailable|required|exceeds|must|match)/i.test(msg);
    this.toastIsError.set(inferred);
    this.toastMessage.set(msg);
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    if (isPlatformBrowser(this.platformId)) {
      this.toastTimeout = setTimeout(() => {
        this.toastMessage.set(null);
        this.toastTimeout = null;
      }, 6000);
    }
  }
}
