import { CurrencyPipe, isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AuthService,
  DEFAULT_NOTIFICATION_PREFS,
  NotificationPreferences,
} from '../../services/auth.service';
import {
  CargoDataService,
  CustomerNotificationItem,
  InvoiceItem,
  ShipmentRecord,
  ShipmentRequestItem,
  SupportTicketItem,
} from '../../services/cargo-data.service';
import { SupabaseService } from '../../services/supabase.service';
import { FreightCalculator } from '../freight-calculator/freight-calculator';

export type CustomerModuleTab =
  | 'overview'
  | 'requests'
  | 'tracking'
  | 'history'
  | 'invoices'
  | 'notifications'
  | 'support'
  | 'settings';

export type NotificationCategoryFilter =
  | 'all'
  | CustomerNotificationItem['category'];

@Component({
  selector: 'app-customer-console',
  imports: [CurrencyPipe, FormsModule, FreightCalculator],
  templateUrl: './customer-console.html',
  styleUrl: './customer-console.css',
})
export class CustomerConsole {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);
  protected readonly auth = inject(AuthService);
  protected readonly cargoData = inject(CargoDataService);

  readonly activeModule = signal<CustomerModuleTab>('overview');
  readonly toastMessage = signal<string | null>(null);
  readonly toastIsError = signal<boolean>(false);
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  protected readonly moduleTabs: ReadonlyArray<{ id: CustomerModuleTab; label: string }> = [
    { id: 'overview', label: 'A. Overview' },
    { id: 'requests', label: 'B. Shipment Requests' },
    { id: 'tracking', label: 'C. Tracking' },
    { id: 'history', label: 'D. History & Docs' },
    { id: 'invoices', label: 'E. Invoices & Payments' },
    { id: 'notifications', label: 'F. Notifications' },
    { id: 'support', label: 'G. Support' },
    { id: 'settings', label: 'H. Account Settings' },
  ];

  // Live signals scoped to the signed-in customer via Supabase RLS
  protected readonly user = this.auth.currentUser;
  protected readonly shipments = this.cargoData.liveShipments;
  protected readonly requests = this.cargoData.shipmentRequests;
  protected readonly invoices = this.cargoData.invoices;
  protected readonly ports = this.cargoData.livePorts;
  protected readonly activityFeed = this.cargoData.activityFeed;
  protected readonly supportTickets = this.cargoData.supportTickets;

  // A. Overview KPI aggregates
  protected readonly activeShipments = computed(() =>
    this.shipments().filter((s) => s.status !== 'Delivered'),
  );
  protected readonly completedShipments = computed(() =>
    this.shipments().filter((s) => s.status === 'Delivered'),
  );
  protected readonly pendingShipments = computed(() =>
    this.shipments().filter((s) => s.status === 'Booking Confirmed'),
  );
  protected readonly dueInvoices = computed(() =>
    this.invoices().filter((inv) => inv.status === 'Due'),
  );
  protected readonly paidInvoices = computed(() =>
    this.invoices().filter((inv) => inv.status === 'Paid'),
  );
  protected readonly outstandingUsd = computed(() =>
    this.dueInvoices().reduce((sum, inv) => sum + inv.amountUsd, 0),
  );
  protected readonly paidTotalUsd = computed(() =>
    this.paidInvoices().reduce((sum, inv) => sum + inv.amountUsd, 0),
  );
  protected readonly usedVerifiedInvoiceIds = computed(
    () =>
      new Set(
        this.requests()
          .filter((r) => r.status !== 'Cancelled' && r.verifiedInvoiceId)
          .map((r) => r.verifiedInvoiceId!),
      ),
  );
  protected readonly verifiedUnusedInvoices = computed(() =>
    this.invoices().filter(
      (inv) =>
        inv.status === 'Paid' &&
        (inv.verificationStatus ?? 'verified') === 'verified' &&
        !this.usedVerifiedInvoiceIds().has(inv.id),
    ),
  );
  protected readonly pendingVerificationInvoices = computed(() =>
    this.invoices().filter((inv) => inv.verificationStatus === 'pending_verification'),
  );
  protected readonly selectedVerifiedInvoiceId = signal<string>('');

  // B. Shipment Request form state
  protected readonly cargoTypeOptions = [
    '40ft High-Cube Dry',
    '20ft Standard Dry',
    '40ft Active Reefer (-18°C)',
    'Consolidated LCL Cargo',
    'Out-of-Gauge / Project Cargo',
    'Hazardous IMO Class Cargo',
  ] as const;
  protected readonly shippingMethodOptions = [
    'Ocean FCL',
    'Ocean LCL',
    'Reefer Cold-Chain',
    'Port-to-Door Multimodal',
    'Express Air-Sea',
  ] as const;

  protected readonly reqCargoType = signal<string>('40ft High-Cube Dry');
  protected readonly reqCargoDescription = signal<string>('');
  protected readonly reqOrigin = signal<string>('Port of Shanghai Yangshan (CNSHA)');
  protected readonly reqDestination = signal<string>('Port of Rotterdam Maasvlakte II (NLRTM)');
  protected readonly reqWeightKg = signal<number>(18500);
  protected readonly reqDimensionsCm = signal<string>('1200 x 235 x 269 cm');
  protected readonly reqShippingMethod = signal<string>('Ocean FCL');
  protected readonly reqIncoterm = signal<'EXW' | 'FOB' | 'CIF' | 'DDP'>('CIF');
  protected readonly reqDocCategory = signal<string>('Commercial Invoice & Packing List');
  protected readonly reqPendingFiles = signal<File[]>([]);
  protected readonly submittingRequest = signal<boolean>(false);

  // C. Shipment Tracking state
  protected readonly trackingQuery = signal<string>('');
  protected readonly selectedTrackingId = signal<string>('');
  protected readonly remoteLookupResult = signal<ShipmentRecord | null>(null);
  protected readonly trackingNotFound = signal<boolean>(false);

  protected readonly trackedShipment = computed<ShipmentRecord | undefined>(() => {
    const remote = this.remoteLookupResult();
    if (remote) {
      return this.shipments().find((s) => s.trackingId === remote.trackingId) ?? remote;
    }
    const sel = this.selectedTrackingId();
    if (sel) {
      return this.shipments().find((s) => s.trackingId === sel);
    }
    return this.shipments()[0];
  });

  protected readonly originHubInfo = computed(() => {
    const ship = this.trackedShipment();
    if (!ship) return undefined;
    return this.ports().find((p) => ship.origin.includes(p.code) || ship.origin.includes(p.name));
  });

  protected readonly destinationHubInfo = computed(() => {
    const ship = this.trackedShipment();
    if (!ship) return undefined;
    return this.ports().find(
      (p) => ship.destination.includes(p.code) || ship.destination.includes(p.name),
    );
  });

  // D. Shipment History state
  protected readonly historyFilter = signal<'all' | 'completed' | 'active'>('all');
  protected readonly historySearch = signal<string>('');
  protected readonly inspectedHistoryShipment = signal<ShipmentRecord | null>(null);

  protected readonly filteredHistoryShipments = computed(() => {
    const filter = this.historyFilter();
    const q = this.historySearch().trim().toLowerCase();
    return this.shipments().filter((s) => {
      if (filter === 'completed' && s.status !== 'Delivered') return false;
      if (filter === 'active' && s.status === 'Delivered') return false;
      if (!q) return true;
      return (
        s.trackingId.toLowerCase().includes(q) ||
        s.containerNumber.toLowerCase().includes(q) ||
        s.origin.toLowerCase().includes(q) ||
        s.destination.toLowerCase().includes(q) ||
        s.cargoType.toLowerCase().includes(q)
      );
    });
  });

  // E. Invoices & Payments state
  protected readonly invoiceFilter = signal<'all' | 'Due' | 'Paid'>('all');
  protected readonly selectedPaymentMethod = signal<string>('Corporate ACH / Wire');
  protected readonly showAdvancePaymentForm = signal<boolean>(false);
  protected readonly advanceLane = signal<string>('CNSHA → NLRTM');
  protected readonly advanceAmountUsd = signal<number>(4250);
  protected readonly advancePaymentRef = signal<string>('');
  protected readonly advanceProofFile = signal<File | null>(null);
  protected readonly submittingPaymentFor = signal<InvoiceItem | null>(null);
  protected readonly existingInvoiceRef = signal<string>('');
  protected readonly existingInvoiceProofFile = signal<File | null>(null);
  protected readonly filteredInvoices = computed(() => {
    const filter = this.invoiceFilter();
    const list = this.invoices();
    return filter === 'all' ? list : list.filter((inv) => inv.status === filter);
  });

  // F. Notifications state
  protected readonly notificationFilter = signal<NotificationCategoryFilter>('all');
  protected readonly allNotifications = computed<CustomerNotificationItem[]>(() => {
    const stored = this.cargoData.customerNotifications();
    const prefs = this.user()?.notificationPrefs ?? DEFAULT_NOTIFICATION_PREFS;
    const derived: CustomerNotificationItem[] = [];

    for (const s of this.shipments()) {
      if (s.status === 'Booking Confirmed' && prefs.shipmentConfirmation) {
        derived.push({
          id: `synth-conf-${s.trackingId}`,
          category: 'confirmation',
          title: `Booking Confirmed · ${s.trackingId}`,
          message: `${s.cargoType} scheduled from ${s.origin} to ${s.destination}.`,
          trackingId: s.trackingId,
          isRead: false,
          createdAt: s.createdAt || 'Active',
        });
      }
      if (s.status === 'In Transit' && prefs.dispatchUpdates) {
        derived.push({
          id: `synth-disp-${s.trackingId}`,
          category: 'dispatch',
          title: `Vessel Dispatched · ${s.trackingId}`,
          message: `${s.vessel} departed with container ${s.containerNumber}. ETA ${s.eta}.`,
          trackingId: s.trackingId,
          isRead: false,
          createdAt: s.eta,
        });
      }
      if (s.status === 'At Berth' && prefs.portArrival) {
        derived.push({
          id: `synth-port-${s.trackingId}`,
          category: 'port_arrival',
          title: `Port Arrival · ${s.trackingId}`,
          message: `Container ${s.containerNumber} berthed at ${s.destination}. Last Free Day: ${s.lastFreeDay || 'TBD'}.`,
          trackingId: s.trackingId,
          isRead: false,
          createdAt: s.eta,
        });
      }
      if (
        (s.status === 'Customs Cleared' ||
          s.customsStatus === 'Cleared' ||
          s.customsStatus === 'Hold / Inspection') &&
        prefs.customsUpdates
      ) {
        derived.push({
          id: `synth-cust-${s.trackingId}`,
          category: 'customs',
          title: `Customs Update (${s.customsStatus || s.status}) · ${s.trackingId}`,
          message:
            s.customsStatus === 'Hold / Inspection'
              ? `Customs inspection hold on ${s.containerNumber}: ${s.disputeNote || 'Review documentation.'}`
              : `Customs clearance status updated for container ${s.containerNumber}.`,
          trackingId: s.trackingId,
          isRead: false,
          createdAt: 'Customs',
        });
      }
      if (s.status === 'Delivered' && prefs.deliveryNotifications) {
        derived.push({
          id: `synth-deliv-${s.trackingId}`,
          category: 'delivery',
          title: `Delivered · ${s.trackingId}`,
          message: `Shipment delivered at ${s.destination}. Proof of delivery and B/L ready in History.`,
          trackingId: s.trackingId,
          isRead: true,
          createdAt: 'Completed',
        });
      }
    }

    if (prefs.invoiceReminders) {
      for (const inv of this.dueInvoices()) {
        derived.push({
          id: `synth-inv-${inv.id}`,
          category: 'invoice',
          title: `Invoice Reminder · ${inv.id}`,
          message: `$${inv.amountUsd.toLocaleString('en-US')} due by ${inv.dueDate} for shipment ${inv.shipmentId}.`,
          trackingId: inv.shipmentId,
          isRead: false,
          createdAt: inv.dueDate,
        });
      }
    }

    const seen = new Set(stored.map((n) => n.title));
    return [...stored, ...derived.filter((d) => !seen.has(d.title))];
  });

  protected readonly filteredNotifications = computed(() => {
    const cat = this.notificationFilter();
    const list = this.allNotifications();
    return cat === 'all' ? list : list.filter((n) => n.category === cat);
  });

  protected readonly unreadNotificationCount = computed(
    () => this.allNotifications().filter((n) => !n.isRead).length,
  );

  // G. Customer Support state
  protected readonly supportType = signal<SupportTicketItem['ticketType']>('enquiry');
  protected readonly supportPriority = signal<SupportTicketItem['priority']>('Normal');
  protected readonly supportTrackingId = signal<string>('');
  protected readonly supportSubject = signal<string>('');
  protected readonly supportMessage = signal<string>('');
  protected readonly supportStatusFilter = signal<'all' | SupportTicketItem['status']>('all');
  protected readonly activeTicketId = signal<string>('');
  protected readonly supportReplyDraft = signal<string>('');

  protected readonly filteredSupportTickets = computed(() => {
    const filter = this.supportStatusFilter();
    const list = this.supportTickets();
    return filter === 'all' ? list : list.filter((t) => t.status === filter);
  });

  protected readonly activeSupportTicket = computed<SupportTicketItem | null>(() => {
    const id = this.activeTicketId();
    const list = this.supportTickets();
    return list.find((t) => t.id === id) ?? list[0] ?? null;
  });

  // H. Account Settings state
  protected readonly profileName = signal<string>('');
  protected readonly profileOrg = signal<string>('');
  protected readonly profileHub = signal<string>('NLRTM');
  protected readonly profilePhone = signal<string>('');
  protected readonly notifPrefsDraft = signal<NotificationPreferences>({
    ...DEFAULT_NOTIFICATION_PREFS,
  });
  protected readonly newPassword = signal<string>('');
  protected readonly confirmPassword = signal<string>('');

  constructor() {
    effect(() => {
      const u = this.user();
      if (u) {
        this.profileName.set(u.name);
        this.profileOrg.set(u.organization);
        this.profileHub.set(u.hub);
        this.profilePhone.set(u.phone ?? '');
        this.notifPrefsDraft.set({
          ...DEFAULT_NOTIFICATION_PREFS,
          ...(u.notificationPrefs ?? {}),
        });
      }
    });

    effect(() => {
      const available = this.verifiedUnusedInvoices();
      const current = this.selectedVerifiedInvoiceId();
      if (available.length === 0) {
        if (current) this.selectedVerifiedInvoiceId.set('');
      } else if (!available.some((inv) => inv.id === current)) {
        this.selectedVerifiedInvoiceId.set(available[0].id);
      }
    });
  }

  protected showToast(message: string, isError?: boolean): void {
    const inferredError =
      isError ?? /(fail|error|could not|invalid|unavailable|required|mismatch)/i.test(message);
    this.toastIsError.set(inferredError);
    this.toastMessage.set(message);
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

  protected dismissToast(): void {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
      this.toastTimeout = null;
    }
    this.toastMessage.set(null);
  }

  // B. Shipment Request handlers
  protected onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const added = Array.from(input.files);
    this.reqPendingFiles.update((prev) => [...prev, ...added]);
    input.value = '';
  }

  protected removePendingFile(index: number): void {
    this.reqPendingFiles.update((prev) => prev.filter((_, idx) => idx !== index));
  }

  async submitShipmentRequest(): Promise<void> {
    if (this.verifiedUnusedInvoices().length === 0) {
      this.showToast(
        'Payment must be submitted and verified by Admin or Staff before making a shipment request.',
        true,
      );
      return;
    }
    if (!this.reqCargoDescription().trim()) {
      this.showToast('Please enter a cargo description before submitting.', true);
      return;
    }
    if (this.reqOrigin() === this.reqDestination()) {
      this.showToast('Origin and destination ports must be different.', true);
      return;
    }

    this.submittingRequest.set(true);
    const res = await this.cargoData.submitCustomerShipmentRequest({
      cargoType: this.reqCargoType(),
      cargoDescription: this.reqCargoDescription(),
      origin: this.reqOrigin(),
      destination: this.reqDestination(),
      weightKg: Number(this.reqWeightKg()) || 12000,
      dimensionsCm: this.reqDimensionsCm(),
      shippingMethod: this.reqShippingMethod(),
      incoterm: this.reqIncoterm(),
      verifiedInvoiceId: this.selectedVerifiedInvoiceId() || this.verifiedUnusedInvoices()[0]?.id,
      files: this.reqPendingFiles(),
      docCategory: this.reqDocCategory(),
    });
    this.submittingRequest.set(false);

    if (!res.ok || !res.shipment) {
      this.showToast(res.error ?? 'Could not submit shipment request.', true);
      return;
    }

    this.reqCargoDescription.set('');
    this.reqPendingFiles.set([]);
    this.selectedTrackingId.set(res.shipment.trackingId);
    this.remoteLookupResult.set(res.shipment);
    this.showToast(
      `Shipping request ${res.request?.requestRef ?? ''} confirmed. Tracking ID: ${res.shipment.trackingId}.`,
    );
  }

  // C. Tracking handlers
  async lookupTracking(): Promise<void> {
    const q = this.trackingQuery().trim();
    if (!q) {
      this.remoteLookupResult.set(null);
      this.trackingNotFound.set(false);
      return;
    }
    const found = await this.cargoData.lookupShipmentRemote(q);
    if (!found) {
      this.remoteLookupResult.set(null);
      this.trackingNotFound.set(true);
      return;
    }
    this.trackingNotFound.set(false);
    this.remoteLookupResult.set(found);
    this.selectedTrackingId.set(found.trackingId);
  }

  protected inspectShipment(trackingId: string): void {
    this.trackingQuery.set(trackingId);
    this.selectedTrackingId.set(trackingId);
    this.remoteLookupResult.set(null);
    this.trackingNotFound.set(false);
    this.activeModule.set('tracking');
  }

  // D. Documents & Downloads
  protected downloadShipmentDocument(shipment: ShipmentRecord, specificDocName?: string): void {
    const lines = [
      'TERMINUS MARITIME INFRASTRUCTURE — SHIPMENT & BILL OF LADING RECORD',
      '===================================================================',
      `Tracking / B/L ID : ${shipment.trackingId}`,
      `Container (ISO)   : ${shipment.containerNumber}`,
      `Seal Number       : ${shipment.sealNumber ?? 'SL-904182'}`,
      `Vessel & IMO      : ${shipment.vessel}`,
      `Voyage            : ${shipment.voyage ?? 'V.264W'}`,
      `Origin            : ${shipment.origin}`,
      `Destination       : ${shipment.destination}`,
      `Shipping Method   : ${shipment.shippingMethod ?? 'Ocean FCL'}`,
      `Incoterm 2020     : ${shipment.incoterm ?? 'CIF'}`,
      `Cargo Type        : ${shipment.cargoType} (${shipment.teu})`,
      `Cargo Description : ${shipment.cargoDescription ?? 'Commercial containerized freight'}`,
      `Weight / VGM      : ${shipment.vgmKg ?? 24800} kg`,
      `Dimensions        : ${shipment.dimensionsCm ?? '1200 x 235 x 269 cm'}`,
      `Current Status    : ${shipment.status} (${shipment.progressPercent}%)`,
      `Customs Status    : ${shipment.customsStatus ?? 'Pending'}`,
      `Estimated Arrival : ${shipment.eta}`,
      `Last Free Day     : ${shipment.lastFreeDay ?? 'N/A'}`,
      '',
      'ATTACHED SHIPPING DOCUMENTS:',
      ...(shipment.shippingDocs?.length
        ? shipment.shippingDocs.map((d) => `  - ${d.name} (${d.category})`)
        : ['  - Digital Bill of Lading (Auto-generated)']),
      '',
      'MOVEMENT HISTORY:',
      ...shipment.milestones.map(
        (m, i) => `  ${i + 1}. [${m.completed ? 'DONE' : 'PEND'}] ${m.timestamp} | ${m.location} — ${m.event}`,
      ),
    ].join('\n');

    const safeFile = specificDocName
      ? specificDocName.replace(/[^a-zA-Z0-9._-]/g, '_')
      : `BL_${shipment.trackingId}.txt`;
    this.triggerDownload(safeFile.endsWith('.txt') ? safeFile : `${safeFile}.txt`, lines);
    this.showToast(`Downloaded ${safeFile} for ${shipment.trackingId}.`);
  }

  async downloadUploadedDoc(
    doc: { name: string; storagePath?: string },
    shipment: ShipmentRecord,
  ): Promise<void> {
    if (doc.storagePath) {
      const client = this.supabase.client() as { storage?: { from: (b: string) => any } } | null;
      if (client?.storage) {
        const { data } = await client.storage
          .from('shipping-documents')
          .createSignedUrl(doc.storagePath, 60);
        if (data?.signedUrl && isPlatformBrowser(this.platformId)) {
          window.open(data.signedUrl, '_blank', 'noopener');
          return;
        }
      }
    }
    this.downloadShipmentDocument(shipment, doc.name);
  }

  // E. Invoices & Payment Receipts (customers submit payment details; Admin/Staff verify)
  protected onProofFileSelected(event: Event, target: 'advance' | 'existing'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (target === 'advance') {
      this.advanceProofFile.set(file);
    } else {
      this.existingInvoiceProofFile.set(file);
    }
  }

  async submitAdvancePayment(): Promise<void> {
    const res = await this.cargoData.submitCustomerAdvancePayment({
      lane: this.advanceLane(),
      amountUsd: Number(this.advanceAmountUsd()) || 4250,
      paymentMethod: this.selectedPaymentMethod(),
      paymentReference: this.advancePaymentRef(),
      proofFile: this.advanceProofFile(),
    });
    if (!res.ok || !res.invoice) {
      this.showToast(res.error ?? 'Could not submit advance payment.', true);
      return;
    }
    this.advancePaymentRef.set('');
    this.advanceProofFile.set(null);
    this.showAdvancePaymentForm.set(false);
    this.showToast(
      `Payment ${res.invoice.id} submitted for Admin/Staff verification. Shipment requests unlock once verified.`,
    );
  }

  protected openPaymentSubmission(inv: InvoiceItem): void {
    this.submittingPaymentFor.set(inv);
    this.existingInvoiceRef.set(inv.paymentReference ?? '');
    this.existingInvoiceProofFile.set(null);
  }

  async submitExistingInvoicePayment(): Promise<void> {
    const inv = this.submittingPaymentFor();
    if (!inv) return;
    const res = await this.cargoData.submitCustomerInvoicePayment(inv.id, {
      paymentMethod: this.selectedPaymentMethod(),
      paymentReference: this.existingInvoiceRef(),
      proofFile: this.existingInvoiceProofFile(),
    });
    if (!res.ok) {
      this.showToast(res.error ?? 'Could not submit payment proof.', true);
      return;
    }
    this.submittingPaymentFor.set(null);
    this.existingInvoiceRef.set('');
    this.existingInvoiceProofFile.set(null);
    this.showToast(`Payment proof for ${inv.id} submitted. Awaiting Admin or Staff verification.`);
  }

  protected useVerifiedInvoiceForRequest(invoiceId: string): void {
    this.selectedVerifiedInvoiceId.set(invoiceId);
    this.activeModule.set('requests');
  }

  protected isInvoiceUsed(invoiceId: string): boolean {
    return this.usedVerifiedInvoiceIds().has(invoiceId);
  }

  protected verificationLabel(inv: InvoiceItem): string {
    const v = inv.verificationStatus ?? (inv.status === 'Paid' ? 'verified' : 'unpaid');
    if (v === 'pending_verification') return 'Pending Verification';
    if (v === 'verified') return 'Verified';
    if (v === 'rejected') return 'Rejected';
    return 'Unpaid';
  }

  protected downloadInvoiceFile(inv: InvoiceItem): void {
    const text = [
      'TERMINUS CARGO INFRASTRUCTURE — FREIGHT INVOICE',
      '================================================',
      `Invoice Number : ${inv.id}`,
      `Shipment ID    : ${inv.shipmentId}`,
      `Trade Lane     : ${inv.lane}`,
      `Amount Due USD : $${inv.amountUsd.toLocaleString('en-US')}`,
      `Due Date       : ${inv.dueDate}`,
      `Status         : ${inv.status}`,
      `Bill To        : ${this.user()?.organization ?? 'Customer'} (${this.user()?.email ?? ''})`,
    ].join('\n');
    this.triggerDownload(`Invoice_${inv.id}.txt`, text);
    this.showToast(`Downloaded invoice ${inv.id}.`);
  }

  protected downloadReceiptFile(inv: InvoiceItem): void {
    const receiptNo = inv.receiptNumber ?? `RCP-${inv.id.replace(/[^0-9]/g, '').slice(-6) || '100420'}`;
    const text = [
      'TERMINUS CARGO INFRASTRUCTURE — OFFICIAL PAYMENT RECEIPT',
      '=========================================================',
      `Receipt Number : ${receiptNo}`,
      `Invoice Number : ${inv.id}`,
      `Shipment ID    : ${inv.shipmentId}`,
      `Trade Lane     : ${inv.lane}`,
      `Amount Paid    : $${inv.amountUsd.toLocaleString('en-US')} USD`,
      `Payment Method : ${inv.paymentMethod ?? 'Corporate ACH / Wire'}`,
      `Settled At     : ${inv.paidAt ? new Date(inv.paidAt).toUTCString() : new Date().toUTCString()}`,
      `Payer          : ${this.user()?.name ?? 'Shipper'} · ${this.user()?.organization ?? ''}`,
    ].join('\n');
    this.triggerDownload(`Receipt_${receiptNo}.txt`, text);
    this.showToast(`Downloaded payment receipt ${receiptNo}.`);
  }

  // G. Customer Support handlers
  async submitSupportRequest(): Promise<void> {
    const res = await this.cargoData.submitSupportTicket({
      ticketType: this.supportType(),
      subject: this.supportSubject(),
      priority: this.supportPriority(),
      shipmentTrackingId: this.supportTrackingId() || null,
      message: this.supportMessage(),
    });
    if (!res.ok || !res.ticket) {
      this.showToast(res.error ?? 'Could not submit support ticket.', true);
      return;
    }
    this.supportSubject.set('');
    this.supportMessage.set('');
    this.activeTicketId.set(res.ticket.id);
    this.showToast(`Support ticket ${res.ticket.ticketRef} created.`);
  }

  async sendSupportReply(): Promise<void> {
    const ticket = this.activeSupportTicket();
    if (!ticket) return;
    const res = await this.cargoData.replyToSupportTicket(ticket.id, this.supportReplyDraft());
    if (!res.ok) {
      this.showToast(res.error ?? 'Could not send message.', true);
      return;
    }
    this.supportReplyDraft.set('');
    this.showToast(`Message posted to ${ticket.ticketRef}.`);
  }

  async markTicketResolved(ticketId: string): Promise<void> {
    const res = await this.cargoData.resolveSupportTicket(ticketId);
    this.showToast(res.ok ? 'Support ticket marked resolved.' : (res.error ?? 'Update failed.'));
  }

  // H. Account Settings handlers
  protected toggleNotifPref(key: keyof NotificationPreferences, checked: boolean): void {
    this.notifPrefsDraft.update((prev) => ({ ...prev, [key]: checked }));
  }

  async saveAccountSettings(): Promise<void> {
    const res = await this.auth.updateOwnProfile({
      name: this.profileName(),
      organization: this.profileOrg(),
      hub: this.profileHub(),
      phone: this.profilePhone(),
      notificationPrefs: this.notifPrefsDraft(),
    });
    if (!res.ok) {
      this.showToast(res.error ?? 'Could not save account settings.', true);
      return;
    }
    this.showToast('Personal details, contact info, and notification preferences saved.');
  }

  async updateAccountPassword(): Promise<void> {
    if (this.newPassword().trim().length < 8) {
      this.showToast('New password must be at least 8 characters.', true);
      return;
    }
    if (this.newPassword() !== this.confirmPassword()) {
      this.showToast('Password confirmation mismatch. Re-enter both fields.', true);
      return;
    }
    const res = await this.auth.changeOwnPassword(this.newPassword());
    if (!res.ok) {
      this.showToast(res.error ?? 'Could not update password.', true);
      return;
    }
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.showToast('Account password updated successfully.');
  }

  protected notificationCategoryLabel(cat: CustomerNotificationItem['category']): string {
    const map: Record<CustomerNotificationItem['category'], string> = {
      confirmation: 'CONFIRMATION',
      dispatch: 'DISPATCH',
      port_arrival: 'PORT ARRIVAL',
      customs: 'CUSTOMS',
      delivery: 'DELIVERY',
      invoice: 'INVOICE',
    };
    return map[cat];
  }

  protected formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private triggerDownload(filename: string, content: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
