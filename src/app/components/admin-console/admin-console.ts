import { CurrencyPipe, isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService, ManagedAccount, UserRole } from '../../services/auth.service';
import {
  CargoDataService,
  ShipmentRecord,
  SystemConfig,
} from '../../services/cargo-data.service';

export type AdminModuleTab =
  | 'overview'
  | 'users'
  | 'dealers'
  | 'shipments'
  | 'financials'
  | 'customs'
  | 'telemetry'
  | 'reports'
  | 'settings';

export const AVAILABLE_PERMISSIONS = [
  { key: 'shipments', label: 'Shipments & Tracking' },
  { key: 'customs', label: 'Customs & Clearance' },
  { key: 'ports', label: 'Port Berth Ops' },
  { key: 'financials', label: 'Invoices & Payments' },
  { key: 'dealers', label: 'Dealer Quotes & Portfolios' },
  { key: 'reports', label: 'Analytics & Exports' },
] as const;

@Component({
  selector: 'app-admin-console',
  imports: [CurrencyPipe, FormsModule],
  templateUrl: './admin-console.html',
  styleUrl: './admin-console.css',
})
export class AdminConsole {
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly auth = inject(AuthService);
  protected readonly cargoData = inject(CargoDataService);

  protected readonly availablePermissions = AVAILABLE_PERMISSIONS;
  readonly activeModule = signal<AdminModuleTab>('overview');
  readonly toastMessage = signal<string | null>(null);
  readonly toastIsError = signal<boolean>(false);
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  protected readonly moduleTabs: ReadonlyArray<{ id: AdminModuleTab; label: string }> = [
    { id: 'overview', label: 'A. Overview' },
    { id: 'users', label: 'B. Users' },
    { id: 'dealers', label: 'C. Dealers' },
    { id: 'shipments', label: 'D. Shipments' },
    { id: 'financials', label: 'E. Financials' },
    { id: 'customs', label: 'F. Customs & Ports' },
    { id: 'telemetry', label: 'G. Telemetry' },
    { id: 'reports', label: 'H. Reports' },
    { id: 'settings', label: 'I. Settings & Security' },
  ];

  // Shared live data signals
  protected readonly accounts = this.auth.managedAccounts;
  protected readonly shipments = this.cargoData.liveShipments;
  protected readonly quotes = this.cargoData.dealerQuotes;
  protected readonly invoices = this.cargoData.invoices;
  protected readonly gateTasks = this.cargoData.gateTasks;
  protected readonly ports = this.cargoData.livePorts;
  protected readonly activityFeed = this.cargoData.activityFeed;
  protected readonly telemetryLogs = this.cargoData.telemetryLogs;

  // A. Overview KPI aggregates
  protected readonly customerAccounts = computed(() =>
    this.accounts().filter((a) => a.role === 'customer'),
  );
  protected readonly dealerAccounts = computed(() =>
    this.accounts().filter((a) => a.role === 'dealer'),
  );
  protected readonly pendingDealers = computed(() =>
    this.dealerAccounts().filter((a) => a.approvalStatus === 'pending'),
  );
  protected readonly staffAccounts = computed(() =>
    this.accounts().filter((a) => a.role === 'staff'),
  );
  protected readonly activeShipments = computed(() =>
    this.shipments().filter((s) => s.status !== 'Delivered'),
  );
  protected readonly completedShipments = computed(() =>
    this.shipments().filter((s) => s.status === 'Delivered'),
  );
  protected readonly pendingShipments = computed(() =>
    this.shipments().filter((s) => s.status === 'Booking Confirmed'),
  );
  protected readonly delayedShipments = computed(() =>
    this.shipments().filter((s) => Boolean(s.isDelayed) || s.customsStatus === 'Hold / Inspection'),
  );
  protected readonly totalPaidRevenueUsd = computed(() =>
    this.invoices()
      .filter((i) => i.status === 'Paid')
      .reduce((acc, i) => acc + i.amountUsd, 0),
  );
  protected readonly outstandingInvoices = computed(() =>
    this.invoices().filter((i) => i.status === 'Due'),
  );
  protected readonly outstandingUsd = computed(() =>
    this.outstandingInvoices().reduce((acc, i) => acc + i.amountUsd, 0),
  );

  // B. User Management state
  protected readonly userSearch = signal('');
  protected readonly userRoleFilter = signal<'all' | UserRole>('all');
  protected readonly showStaffCreator = signal(false);
  protected readonly newStaffName = signal('');
  protected readonly newStaffEmail = signal('');
  protected readonly newStaffPassword = signal('');
  protected readonly newStaffOrg = signal('Terminus Port Operations');
  protected readonly newStaffHub = signal('NLRTM');
  protected readonly editingAccount = signal<ManagedAccount | null>(null);
  protected readonly editStaffTitle = signal('');
  protected readonly editPermissions = signal<string[]>([]);
  protected readonly issuedStaffPasswords = this.auth.issuedStaffPasswords;
  protected readonly revealedStaffIds = signal<Record<string, boolean>>({});
  protected readonly editingStaffPassword = signal<ManagedAccount | null>(null);
  protected readonly newTempPassword = signal('');
  protected readonly inspectingUserLogs = signal<ManagedAccount | null>(null);
  protected readonly userMatchedEvents = computed(() => {
    const target = this.inspectingUserLogs();
    if (!target) return [];
    const emailLower = target.email.toLowerCase();
    const nameLower = target.name.toLowerCase();
    return this.telemetryLogs().filter(
      (log) =>
        log.message.toLowerCase().includes(emailLower) ||
        log.message.toLowerCase().includes(nameLower),
    );
  });

  // C. Dealer profile editing & portfolio drawer
  protected readonly editingDealerProfile = signal<ManagedAccount | null>(null);
  protected readonly editProfileOrg = signal('');
  protected readonly editProfileHub = signal('NLRTM');
  protected readonly editProfileDocRef = signal('');
  protected readonly selectedDealerPortfolioId = signal<string | null>(null);
  protected readonly selectedDealerPortfolioShipments = computed(() => {
    const did = this.selectedDealerPortfolioId();
    return did ? this.shipments().filter((s) => s.dealerId === did) : [];
  });

  protected readonly filteredAccounts = computed(() => {
    const q = this.userSearch().trim().toLowerCase();
    const role = this.userRoleFilter();
    return this.accounts().filter((a) => {
      if (role !== 'all' && a.role !== role) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.organization.toLowerCase().includes(q) ||
        a.hub.toLowerCase().includes(q)
      );
    });
  });

  // C. Dealer performance metrics
  protected readonly dealerMetrics = computed(() =>
    this.dealerAccounts().map((dealer) => {
      const assignedShipments = this.shipments().filter((s) => s.dealerId === dealer.id);
      const clientQuotes = this.quotes();
      return {
        dealer,
        shipmentCount: assignedShipments.length,
        quoteCount: clientQuotes.length,
        avgMargin:
          clientQuotes.length > 0
            ? (
                clientQuotes.reduce((acc, q) => acc + q.marginPercent, 0) / clientQuotes.length
              ).toFixed(1)
            : '0.0',
        portfolioVolumeUsd: assignedShipments.reduce(
          (acc, s) => acc + (s.freightChargeUsd ?? 0),
          0,
        ),
      };
    }),
  );

  // D. Shipment Management state
  protected readonly shipmentSearch = signal('');
  protected readonly shipmentFilter = signal<'All' | 'Delayed' | ShipmentRecord['status']>('All');
  protected readonly showCreateShipment = signal(false);
  protected readonly newShipOrigin = signal('Port of Shanghai Yangshan (CNSHA)');
  protected readonly newShipDest = signal('Port of Rotterdam Maasvlakte II (NLRTM)');
  protected readonly newShipCargo = signal('40ft High-Cube · Precision Freight');
  protected readonly newShipIncoterm = signal<'EXW' | 'FOB' | 'CIF' | 'DDP'>('CIF');
  protected readonly newShipCustomerId = signal('');
  protected readonly newShipDealerId = signal('');
  protected readonly newShipStaffId = signal('');
  protected readonly newShipFreightUsd = signal(4800);
  protected readonly editingDisputeTrackingId = signal<string | null>(null);
  protected readonly disputeNoteDraft = signal('');
  protected readonly editingVesselShipment = signal<ShipmentRecord | null>(null);
  protected readonly editShipVessel = signal('');
  protected readonly editShipVoyage = signal('');
  protected readonly editShipContainer = signal('');
  protected readonly editShipEta = signal('');
  protected readonly editShipLfd = signal('');
  protected readonly editShipFreightUsd = signal(4250);

  protected readonly filteredShipments = computed(() => {
    const q = this.shipmentSearch().trim().toLowerCase();
    const f = this.shipmentFilter();
    return this.shipments().filter((s) => {
      if (f === 'Delayed' && !s.isDelayed && s.customsStatus !== 'Hold / Inspection') return false;
      if (f !== 'All' && f !== 'Delayed' && s.status !== f) return false;
      if (!q) return true;
      return (
        s.trackingId.toLowerCase().includes(q) ||
        s.containerNumber.toLowerCase().includes(q) ||
        s.origin.toLowerCase().includes(q) ||
        s.destination.toLowerCase().includes(q) ||
        s.vessel.toLowerCase().includes(q)
      );
    });
  });

  // E. Financial Management state
  protected readonly newInvoiceShipmentId = signal('');
  protected readonly newInvoiceAmountUsd = signal(3450);

  // F. Customs & Port Operations state
  protected readonly customsHoldOnly = signal(false);
  protected readonly gateContainerInput = signal('');
  protected readonly gateTerminalInput = signal('Rotterdam Maasvlakte II');
  protected readonly gateVesselInput = signal('MV Terminus Horizon');
  protected readonly gateActionInput = signal('Customs X-Ray Inspection & Release');

  protected readonly customsShipments = computed(() =>
    this.shipments().filter(
      (s) => !this.customsHoldOnly() || s.customsStatus === 'Hold / Inspection' || s.isDelayed,
    ),
  );

  // G. Telemetry state
  protected readonly telemetrySeverityFilter = signal<'all' | 'info' | 'warn' | 'error'>('all');
  protected readonly errorTelemetryCount = computed(
    () => this.telemetryLogs().filter((l) => l.severity === 'error').length,
  );
  protected readonly filteredTelemetry = computed(() => {
    const sev = this.telemetrySeverityFilter();
    return this.telemetryLogs().filter((log) => sev === 'all' || log.severity === sev);
  });

  // H. Analytics aggregates & preview selection
  protected readonly selectedReportPreview = signal<
    'shipments' | 'financials' | 'customers' | 'dealers' | 'staff' | 'customs'
  >('shipments');
  protected readonly staffPerformance = computed(() =>
    this.staffAccounts().map((staff) => {
      const owned = this.shipments().filter((s) => s.assignedStaffId === staff.id);
      const cleared = owned.filter(
        (s) => s.customsStatus === 'Cleared' || s.status === 'Delivered',
      );
      return {
        staff,
        assignedCount: owned.length,
        clearedCount: cleared.length,
      };
    }),
  );

  protected readonly customsBreakdown = computed(() => {
    const all = this.shipments();
    const stages: Array<NonNullable<ShipmentRecord['customsStatus']>> = [
      'Pending',
      'Docs Verified',
      'Hold / Inspection',
      'Cleared',
    ];
    return stages.map((stage) => ({
      stage,
      count: all.filter((s) => (s.customsStatus ?? 'Pending') === stage).length,
    }));
  });

  // I. System Config working copy
  protected readonly configDraft = signal<SystemConfig>({ ...this.cargoData.systemConfig() });

  constructor() {
    effect(() => {
      this.configDraft.set({ ...this.cargoData.systemConfig() });
    });
  }
  protected readonly rbacMatrix = [
    {
      role: 'Super Admin / Admin',
      scope: 'Full platform governance, staff creation, dealer approval, financial overrides, RLS & system settings',
    },
    {
      role: 'Staff (Port / Customs)',
      scope: 'Assigned container milestones, customs clearance verification, berth gate task execution',
    },
    {
      role: 'Dealer (Verified Partner)',
      scope: 'Client portfolio bookings, quote/margin creation, assigned freight tracking & invoices',
    },
    {
      role: 'Customer',
      scope: 'Self-booked shipment tracking, freight calculator quotes, own invoice settlement',
    },
  ];

  // --- Actions ---
  async createStaffAccount(): Promise<void> {
    if (!this.newStaffName().trim() || !this.newStaffEmail().trim() || !this.newStaffPassword()) {
      this.flash('Provide staff full name, email, and temporary password.');
      return;
    }
    const res = await this.auth.createStaffByAdmin({
      fullName: this.newStaffName(),
      email: this.newStaffEmail(),
      password: this.newStaffPassword(),
      organization: this.newStaffOrg(),
      hubLocode: this.newStaffHub(),
    });
    if (!res.ok) {
      this.flash(res.error ?? 'Failed to create staff account.');
      return;
    }
    this.newStaffName.set('');
    this.newStaffEmail.set('');
    this.newStaffPassword.set('');
    this.showStaffCreator.set(false);
    this.flash('Staff account provisioned in Supabase.');
  }

  openPermissionEditor(account: ManagedAccount): void {
    this.editingAccount.set(account);
    this.editStaffTitle.set(account.staffTitle ?? '');
    this.editPermissions.set([...account.permissions]);
  }

  togglePermissionKey(key: string): void {
    this.editPermissions.update((list) =>
      list.includes(key) ? list.filter((k) => k !== key) : [...list, key],
    );
  }

  async saveAccountPermissions(): Promise<void> {
    const target = this.editingAccount();
    if (!target) return;
    const res = await this.auth.updateAccountPermissions(
      target.id,
      this.editPermissions(),
      this.editStaffTitle().trim() || undefined,
    );
    if (!res.ok) {
      this.flash(res.error ?? 'Could not save permissions.');
      return;
    }
    this.editingAccount.set(null);
    this.flash(`Updated role & permissions for ${target.name}.`);
  }

  openDealerProfileEditor(dealer: ManagedAccount): void {
    this.editingDealerProfile.set(dealer);
    this.editProfileOrg.set(dealer.organization);
    this.editProfileHub.set(dealer.hub);
    this.editProfileDocRef.set(dealer.businessRegNumber ?? '');
  }

  async saveDealerProfile(): Promise<void> {
    const dealer = this.editingDealerProfile();
    if (!dealer) return;
    const res = await this.auth.updateAccountProfile(dealer.id, {
      organization: this.editProfileOrg(),
      hub: this.editProfileHub(),
      businessRegNumber: this.editProfileDocRef(),
    });
    if (!res.ok) {
      this.flash(res.error ?? 'Could not update dealer profile.');
      return;
    }
    this.editingDealerProfile.set(null);
    this.flash(`Verified & updated profile for ${dealer.name}.`);
  }

  openVesselEditor(shipment: ShipmentRecord): void {
    this.editingVesselShipment.set(shipment);
    this.editShipVessel.set(shipment.vessel.replace(/\s*\(IMO[^)]*\)\s*/i, '').trim());
    this.editShipVoyage.set(shipment.voyage ?? 'V.264W');
    this.editShipContainer.set(shipment.containerNumber);
    this.editShipEta.set(shipment.eta);
    this.editShipLfd.set(shipment.lastFreeDay ?? 'Dec 03, 2026');
    this.editShipFreightUsd.set(shipment.freightChargeUsd ?? 4250);
  }

  async saveVesselDetails(): Promise<void> {
    const s = this.editingVesselShipment();
    if (!s) return;
    const res = await this.cargoData.updateShipmentAdmin(s.trackingId, {
      vessel: this.editShipVessel(),
      voyage: this.editShipVoyage(),
      containerNumber: this.editShipContainer(),
      eta: this.editShipEta(),
      lastFreeDay: this.editShipLfd(),
      freightChargeUsd: Number(this.editShipFreightUsd()) || 4250,
    });
    if (!res.ok) {
      this.flash(res.error ?? 'Failed to update vessel/container details.');
      return;
    }
    this.editingVesselShipment.set(null);
    this.flash(`Updated vessel, container & arrival schedule for ${s.trackingId}.`);
  }

  async decideDealer(id: string, decision: 'approved' | 'rejected'): Promise<void> {
    const res = await this.auth.verifyDealer(id, decision);
    this.flash(res.ok ? `Dealer registration ${decision}.` : (res.error ?? 'Update failed.'));
  }

  async toggleAccountActive(id: string): Promise<void> {
    const res = await this.auth.toggleAccountStatus(id);
    this.flash(res.ok ? 'Account access status updated.' : (res.error ?? 'Update failed.'));
  }

  async resetUserPassword(email: string): Promise<void> {
    const msg = await this.auth.resetPasswordAsync(email);
    this.flash(msg);
  }

  toggleRevealStaffPassword(staffId: string): void {
    this.revealedStaffIds.update((map) => ({ ...map, [staffId]: !map[staffId] }));
  }

  openSetStaffPassword(acc: ManagedAccount): void {
    this.editingStaffPassword.set(acc);
    this.newTempPassword.set('');
  }

  generateTempPassword(): void {
    const num = Math.floor(1000 + Math.random() * 8999);
    this.newTempPassword.set(`TrM#${num}Ops!`);
  }

  async saveStaffPassword(): Promise<void> {
    const target = this.editingStaffPassword();
    if (!target) return;
    const res = await this.auth.setStaffPasswordByAdmin(target.id, this.newTempPassword());
    if (!res.ok) {
      this.flash(res.error ?? 'Failed to set staff password.', true);
      return;
    }
    this.revealedStaffIds.update((map) => ({ ...map, [target.id]: true }));
    this.editingStaffPassword.set(null);
    this.newTempPassword.set('');
    this.flash(`Issued new temporary password for ${target.name}. Copy and share securely.`);
  }

  copyText(val: string, label: string): void {
    if (isPlatformBrowser(this.platformId) && navigator.clipboard) {
      void navigator.clipboard.writeText(val);
    }
    this.flash(`${label} copied to clipboard.`);
  }

  async createAssignedShipment(): Promise<void> {
    const res = await this.cargoData.addShipment(
      this.newShipOrigin(),
      this.newShipDest(),
      this.newShipCargo(),
      this.newShipIncoterm(),
      {
        customerId: this.newShipCustomerId() || null,
        dealerId: this.newShipDealerId() || null,
        assignedStaffId: this.newShipStaffId() || null,
        freightChargeUsd: Number(this.newShipFreightUsd()) || 4800,
      },
    );
    if (!res.ok || !res.shipment) {
      this.flash(res.error ?? 'Could not create shipment.');
      return;
    }
    this.showCreateShipment.set(false);
    this.flash(`Created & assigned shipment ${res.shipment.trackingId}.`);
  }

  async assignStaffToShipment(trackingId: string, staffId: string): Promise<void> {
    const res = await this.cargoData.updateShipmentAdmin(trackingId, {
      assignedStaffId: staffId || null,
    });
    this.flash(res.ok ? `Assigned staff to ${trackingId}.` : (res.error ?? 'Assignment failed.'));
  }

  async setShipmentStatus(trackingId: string, status: ShipmentRecord['status']): Promise<void> {
    const res = await this.cargoData.updateShipmentAdmin(trackingId, { status });
    this.flash(res.ok ? `${trackingId} updated to ${status}.` : (res.error ?? 'Update failed.'));
  }

  async setCustomsStatus(
    trackingId: string,
    customsStatus: NonNullable<ShipmentRecord['customsStatus']>,
  ): Promise<void> {
    const res = await this.cargoData.updateShipmentAdmin(trackingId, { customsStatus });
    this.flash(
      res.ok ? `Customs status for ${trackingId}: ${customsStatus}.` : (res.error ?? 'Update failed.'),
    );
  }

  async toggleShipmentDelay(shipment: ShipmentRecord): Promise<void> {
    const nextDelayed = !shipment.isDelayed;
    const res = await this.cargoData.updateShipmentAdmin(shipment.trackingId, {
      isDelayed: nextDelayed,
      disputeNote: nextDelayed ? shipment.disputeNote ?? 'Flagged for schedule review' : null,
    });
    this.flash(
      res.ok
        ? `${shipment.trackingId} ${nextDelayed ? 'flagged delayed/disputed' : 'cleared delay flag'}.`
        : (res.error ?? 'Update failed.'),
    );
  }

  openDisputeEditor(shipment: ShipmentRecord): void {
    this.editingDisputeTrackingId.set(shipment.trackingId);
    this.disputeNoteDraft.set(shipment.disputeNote ?? '');
  }

  async saveDisputeNote(trackingId: string): Promise<void> {
    const res = await this.cargoData.updateShipmentAdmin(trackingId, {
      isDelayed: true,
      disputeNote: this.disputeNoteDraft().trim() || 'Under operational review',
    });
    this.editingDisputeTrackingId.set(null);
    this.flash(res.ok ? `Dispute note recorded for ${trackingId}.` : (res.error ?? 'Failed to save note.'));
  }

  async issueNewInvoice(): Promise<void> {
    const targetId = this.newInvoiceShipmentId() || this.shipments()[0]?.trackingId;
    const ship = this.shipments().find((s) => s.trackingId === targetId);
    if (!ship) {
      this.flash('Select an active shipment to bill.');
      return;
    }
    await this.cargoData.issueInvoice(ship, Number(this.newInvoiceAmountUsd()) || 3450);
    this.flash(`Issued invoice for ${ship.trackingId}.`);
  }

  async markInvoicePaid(invoiceId: string): Promise<void> {
    await this.cargoData.payInvoice(invoiceId);
    this.flash('Invoice marked Paid.');
  }

  async approveQuote(quoteId: string): Promise<void> {
    const res = await this.cargoData.setQuoteDecision(quoteId, 'Approved');
    this.flash(res.ok ? 'Dealer quotation & margin approved.' : (res.error ?? 'Approval failed.'));
  }

  async rejectQuote(quoteId: string): Promise<void> {
    const res = await this.cargoData.setQuoteDecision(quoteId, 'Rejected');
    this.flash(res.ok ? `Quotation ${quoteId} marked Rejected.` : (res.error ?? 'Rejection failed.'));
  }

  async createPortGateTask(): Promise<void> {
    if (!this.gateContainerInput().trim()) {
      this.flash('Enter a container number for the port task.');
      return;
    }
    const res = await this.cargoData.addGateTask({
      containerNumber: this.gateContainerInput().trim().toUpperCase(),
      terminalName: this.gateTerminalInput(),
      vesselName: this.gateVesselInput(),
      actionRequired: this.gateActionInput(),
    });
    if (!res.ok) {
      this.flash(res.error ?? 'Failed to add gate task.');
      return;
    }
    this.gateContainerInput.set('');
    this.flash('Port & customs task queued.');
  }

  async sendTelemetryHeartbeat(): Promise<void> {
    await this.cargoData.logTelemetry(
      'API',
      'info',
      '/realtime/v1/heartbeat',
      42,
      'Admin triggered connectivity & RLS health check.',
    );
    await this.cargoData.refreshAllFromSupabase();
    this.flash('Telemetry heartbeat logged & state synced.');
  }

  async savePlatformSettings(): Promise<void> {
    const draft = this.configDraft();
    if (draft.dealerMinMarginPercent < 0 || draft.dealerMaxMarginPercent < draft.dealerMinMarginPercent) {
      this.flash('Dealer Max Margin must be greater than or equal to Min Margin (≥ 0%).', true);
      return;
    }
    const res = await this.cargoData.saveSystemConfig(draft);
    this.flash(
      res.ok ? 'System settings saved to Supabase.' : (res.error ?? 'Failed to save settings.'),
    );
  }

  updateConfigBool(key: keyof SystemConfig, val: boolean): void {
    this.configDraft.update((cfg) => ({ ...cfg, [key]: val }));
  }

  updateConfigNumber(
    key: 'demurrageAlertHours' | 'aisPollingMinutes' | 'dealerMinMarginPercent' | 'dealerMaxMarginPercent',
    val: number,
  ): void {
    const num = Number(val);
    this.configDraft.update((cfg) => ({ ...cfg, [key]: Number.isNaN(num) ? 0 : num }));
  }

  buildCsvReport(
    kind: 'shipments' | 'financials' | 'customers' | 'dealers' | 'staff' | 'customs',
  ): string {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    if (kind === 'shipments') {
      const header = ['TrackingID', 'Container', 'Origin', 'Destination', 'Status', 'Customs', 'Delayed', 'FreightUSD'];
      const rows = this.shipments().map((s) => [
        s.trackingId,
        s.containerNumber,
        s.origin,
        s.destination,
        s.status,
        s.customsStatus ?? 'Pending',
        s.isDelayed ? 'YES' : 'NO',
        s.freightChargeUsd ?? 0,
      ]);
      return [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
    }
    if (kind === 'financials') {
      const header = ['InvoiceID', 'Shipment', 'Lane', 'AmountUSD', 'DueDate', 'Status'];
      const rows = this.invoices().map((i) => [
        i.id,
        i.shipmentId,
        i.lane,
        i.amountUsd,
        i.dueDate,
        i.status,
      ]);
      return [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
    }
    if (kind === 'customers') {
      const header = ['Customer', 'Email', 'Organization', 'Hub', 'Shipments'];
      const rows = this.customerAccounts().map((c) => [
        c.name,
        c.email,
        c.organization,
        c.hub,
        this.shipments().filter((s) => s.customerId === c.id).length,
      ]);
      return [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
    }
    if (kind === 'dealers') {
      const header = ['Dealer', 'Organization', 'ApprovalStatus', 'Shipments', 'PortfolioUSD'];
      const rows = this.dealerMetrics().map((m) => [
        m.dealer.name,
        m.dealer.organization,
        m.dealer.approvalStatus,
        m.shipmentCount,
        m.portfolioVolumeUsd,
      ]);
      return [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
    }
    if (kind === 'staff') {
      const header = ['StaffName', 'Title', 'Hub', 'AssignedShipments', 'ClearedOrDelivered'];
      const rows = this.staffPerformance().map((sp) => [
        sp.staff.name,
        sp.staff.staffTitle ?? 'Operator',
        sp.staff.hub,
        sp.assignedCount,
        sp.clearedCount,
      ]);
      return [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
    }
    const header = ['Stage', 'Count'];
    const rows = this.customsBreakdown().map((c) => [c.stage, c.count]);
    return [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
  }

  downloadCsv(
    kind: 'shipments' | 'financials' | 'customers' | 'dealers' | 'staff' | 'customs',
  ): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const csv = this.buildCsvReport(kind);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `terminus-${kind}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.flash(`Exported terminus-${kind}-report.csv`);
  }

  printPdfReport(): void {
    if (isPlatformBrowser(this.platformId) && typeof window.print === 'function') {
      window.print();
    }
  }

  staffNameById(id?: string | null): string {
    if (!id) return 'Unassigned';
    return this.accounts().find((a) => a.id === id)?.name ?? 'Staff Member';
  }

  displayRoleSubtitle(acc: ManagedAccount): string {
    if (acc.role === 'staff') {
      return acc.staffTitle || 'Operations Specialist';
    }
    if (acc.role === 'admin') {
      return acc.staffTitle && acc.staffTitle !== 'Operations Specialist'
        ? acc.staffTitle
        : 'Super Admin';
    }
    if (acc.role === 'dealer') {
      return acc.businessRegNumber ? `License ${acc.businessRegNumber}` : 'Partner Broker';
    }
    return 'Shipper Account';
  }

  formatLoginTime(raw?: string): string {
    if (!raw) return 'Not signed in yet';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  dismissToast(): void {
    this.toastMessage.set(null);
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
      this.toastTimeout = null;
    }
  }

  private flash(msg: string, isError?: boolean): void {
    const inferredError =
      isError ??
      /(fail|error|could not|invalid|unavailable|required|rejected|enter a )/i.test(msg);
    this.toastIsError.set(inferredError);
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
