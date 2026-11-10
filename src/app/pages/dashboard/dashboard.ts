import { CurrencyPipe, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CargoDataService, ShipmentRecord } from '../../services/cargo-data.service';
import { FreightCalculator } from '../../components/freight-calculator/freight-calculator';
import { PortNetwork } from '../../components/port-network/port-network';
import { AdminConsole } from '../../components/admin-console/admin-console';
import { CustomerConsole } from '../../components/customer-console/customer-console';
import { DealerConsole } from '../../components/dealer-console/dealer-console';

type DashboardTab = 'overview' | 'shipments' | 'workspace' | 'ports';

interface KpiCard {
  label: string;
  value: string;
  delta: string;
}

@Component({
  selector: 'app-dashboard-page',
  imports: [CurrencyPipe, FormsModule, FreightCalculator, PortNetwork, AdminConsole, CustomerConsole, DealerConsole],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardPage implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly auth = inject(AuthService);
  protected readonly cargoData = inject(CargoDataService);

  ngOnInit(): void {
    void this.cargoData.refreshAllFromSupabase();
  }

  protected readonly activeTab = signal<DashboardTab>('overview');

  protected readonly searchQuery = signal('');
  protected readonly statusFilter = signal<string>('All');
  protected readonly assignedToMeOnly = signal(false);
  protected readonly selectedShipmentId = signal<string>('');

  // Staff gate task quick creator
  protected readonly staffGateContainer = signal('');
  protected readonly staffGateTerminal = signal('Rotterdam Maasvlakte II');
  protected readonly staffGateVessel = signal('MV Terminus Horizon');
  protected readonly staffGateAction = signal('Customs Verification & Gate Release');

  // Dealer commercial quote builder
  protected readonly showDealerQuoteForm = signal(false);
  protected readonly quoteClientName = signal('');
  protected readonly quoteClientEmail = signal('');
  protected readonly quoteLane = signal('CNSHA → NLRTM');
  protected readonly quoteMode = signal('40ft High-Cube');
  protected readonly quoteRateUsd = signal(4650);
  protected readonly quoteMarginPercent = signal(8.5);
  protected readonly quoteNotes = signal('');

  protected readonly showBookingForm = signal(false);
  protected readonly newOrigin = signal('Port of Shanghai Yangshan (CNSHA)');
  protected readonly newDestination = signal('Port of Rotterdam Maasvlakte II (NLRTM)');
  protected readonly newCargoType = signal('40ft High-Cube · Precision Machinery');
  protected readonly newIncoterm = signal<'EXW' | 'FOB' | 'CIF' | 'DDP'>('CIF');

  protected readonly showStaffForm = signal(false);
  protected readonly staffFullName = signal('');
  protected readonly staffEmail = signal('');
  protected readonly staffPassword = signal('');
  protected readonly staffOrg = signal('Terminus Port Operations');
  protected readonly staffHub = signal('NLRTM');
  protected readonly staffError = signal('');

  protected readonly user = this.auth.currentUser;
  protected readonly shipments = this.cargoData.liveShipments;
  protected readonly dealerQuotes = this.cargoData.dealerQuotes;
  protected readonly invoices = this.cargoData.invoices;
  protected readonly gateTasks = this.cargoData.gateTasks;
  protected readonly activityFeed = this.cargoData.activityFeed;
  protected readonly accounts = this.auth.managedAccounts;
  protected readonly pendingDealers = computed(() =>
    this.accounts().filter((a) => a.role === 'dealer' && a.approvalStatus === 'pending'),
  );
  protected readonly toastMessage = signal<string | null>(null);
  protected readonly toastIsError = signal<boolean>(false);
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  protected readonly corridorBars = computed(() => {
    const list = this.shipments();
    const total = Math.max(list.length, 1);
    const lanes = [
      { label: 'CNSHA → NLRTM', match: 'CNSHA' },
      { label: 'SGSIN → USLGB', match: 'SGSIN' },
      { label: 'DEHAM → USSAV', match: 'DEHAM' },
      { label: 'OTHER CORRIDORS', match: '' },
    ];
    return lanes.map((l) => {
      const count = l.match
        ? list.filter((s) => s.origin.includes(l.match) || s.destination.includes(l.match)).length
        : list.filter(
            (s) =>
              !s.origin.includes('CNSHA') &&
              !s.origin.includes('SGSIN') &&
              !s.origin.includes('DEHAM'),
          ).length;
      return {
        lane: l.label,
        count,
        percent: list.length === 0 ? 0 : Math.round((count / total) * 100),
      };
    });
  });

  protected readonly roleWorkspaceLabel = computed(() => {
    switch (this.auth.currentRole()) {
      case 'dealer':
        return 'Dealer Quotes';
      case 'staff':
        return 'Port Gate Queue';
      case 'admin':
        return 'Users & Access';
      default:
        return 'Billing & Rates';
    }
  });

  protected readonly kpis = computed<KpiCard[]>(() => {
    const shipments = this.shipments();
    const count = shipments.length;
    const role = this.auth.currentRole() ?? 'customer';

    switch (role) {
      case 'dealer': {
        const pendingQuotes = this.dealerQuotes().filter((q) => q.status === 'Pending Review').length;
        const totalRate = this.dealerQuotes().reduce((sum, q) => sum + q.rateUsd, 0);
        return [
          { label: 'Assigned Shipments', value: `${count}`, delta: 'Live RLS scoped' },
          { label: 'Pending Broker Quotes', value: `${pendingQuotes}`, delta: `${this.dealerQuotes().length} total quotes` },
          { label: 'Quoted Pipeline', value: `$${totalRate.toLocaleString('en-US')}`, delta: '8.5% avg margin' },
          { label: 'Live Port Hubs', value: `${this.cargoData.livePorts().length}`, delta: 'Synced terminals' },
        ];
      }
      case 'staff': {
        const openTasks = this.gateTasks().filter((t) => !t.completed).length;
        return [
          { label: 'Open Gate Tasks', value: `${openTasks}`, delta: `${this.gateTasks().length} total queued` },
          { label: 'Active Shipments', value: `${count}`, delta: 'AIS telemetry live' },
          { label: 'Optimal Terminals', value: `${this.cargoData.livePorts().filter((p) => p.berthStatus === 'Optimal').length}`, delta: 'Berth status live' },
          { label: 'Activity Events', value: `${this.activityFeed().length}`, delta: 'Realtime stream' },
        ];
      }
      case 'admin': {
        const activeAccounts = this.accounts().filter((a) => a.active).length;
        const totalInvoiced = this.invoices().reduce((sum, inv) => sum + inv.amountUsd, 0);
        return [
          { label: 'Live Shipments', value: `${count}`, delta: 'Global fleet' },
          { label: 'Active Accounts', value: `${activeAccounts} / ${this.accounts().length}`, delta: `${this.pendingDealers().length} pending dealers` },
          { label: 'Total Invoiced', value: `$${totalInvoiced.toLocaleString('en-US')}`, delta: `${this.invoices().length} invoices` },
          { label: 'Sync Status', value: this.cargoData.isRealtimeLive() ? 'LIVE' : 'OFFLINE', delta: this.cargoData.lastSyncLabel() },
        ];
      }
      default: {
        const dueInvoices = this.invoices().filter((i) => i.status === 'Due');
        const dueTotal = dueInvoices.reduce((sum, i) => sum + i.amountUsd, 0);
        return [
          { label: 'Your Shipments', value: `${count}`, delta: 'Live Postgres sync' },
          { label: 'Your Quotes', value: `${this.dealerQuotes().length}`, delta: 'Lane requests' },
          { label: 'Invoices Due', value: `${dueInvoices.length}`, delta: `$${dueTotal.toLocaleString('en-US')} due` },
          { label: 'Port Terminals', value: `${this.cargoData.livePorts().length}`, delta: 'Global hubs' },
        ];
      }
    }
  });

  protected readonly filteredShipments = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();
    const uid = this.auth.currentUser()?.id;
    const onlyMine = this.assignedToMeOnly() && this.auth.currentRole() === 'staff';

    return this.shipments().filter((s) => {
      if (onlyMine && s.assignedStaffId !== uid) return false;
      const matchesStatus = status === 'All' || s.status === status;
      const matchesQuery =
        !query ||
        s.trackingId.toLowerCase().includes(query) ||
        s.containerNumber.toLowerCase().includes(query) ||
        s.vessel.toLowerCase().includes(query) ||
        s.origin.toLowerCase().includes(query) ||
        s.destination.toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  });

  protected readonly selectedShipment = computed<ShipmentRecord | undefined>(
    () =>
      this.shipments().find((s) => s.trackingId === this.selectedShipmentId()) ??
      this.shipments()[0],
  );

  protected readonly canManageShipments = computed(() => {
    const role = this.auth.currentRole();
    return role === 'staff' || role === 'admin';
  });

  protected readonly canIssueInvoices = computed(() => {
    const role = this.auth.currentRole();
    return role === 'dealer' || role === 'admin';
  });

  protected async createBooking(): Promise<void> {
    const res = await this.cargoData.addShipment(
      this.newOrigin(),
      this.newDestination(),
      this.newCargoType(),
      this.newIncoterm(),
    );
    if (!res.ok || !res.shipment) {
      this.showToast(res.error ?? 'Failed to create booking.');
      return;
    }
    this.selectedShipmentId.set(res.shipment.trackingId);
    this.showBookingForm.set(false);
    this.activeTab.set('shipments');
    this.showToast(`Booking ${res.shipment.trackingId} (${res.shipment.incoterm}) saved.`);
  }

  protected inspectShipment(trackingId: string): void {
    this.selectedShipmentId.set(trackingId);
    this.activeTab.set('shipments');
  }

  protected showToast(message: string, isError?: boolean): void {
    const inferredError =
      isError ?? /(fail|error|could not|invalid|unavailable|required|rejected)/i.test(message);
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

  protected async handleAdvanceStage(trackingId: string): Promise<void> {
    const res = await this.cargoData.advanceShipmentStatus(trackingId);
    this.showToast(res.ok ? `Updated stage for ${trackingId}` : (res.error ?? 'Update failed.'));
  }

  protected async handleStaffCustomsUpdate(
    trackingId: string,
    customsStatus: NonNullable<ShipmentRecord['customsStatus']>,
  ): Promise<void> {
    const res = await this.cargoData.updateShipmentAdmin(trackingId, { customsStatus });
    this.showToast(
      res.ok ? `Customs status for ${trackingId}: ${customsStatus}` : (res.error ?? 'Update failed.'),
    );
  }

  protected async handleCreateStaffGateTask(): Promise<void> {
    if (!this.staffGateContainer().trim()) {
      this.showToast('Enter a container number for the gate task.', true);
      return;
    }
    const res = await this.cargoData.addGateTask({
      containerNumber: this.staffGateContainer().trim().toUpperCase(),
      terminalName: this.staffGateTerminal(),
      vesselName: this.staffGateVessel(),
      actionRequired: this.staffGateAction(),
    });
    if (!res.ok) {
      this.showToast(res.error ?? 'Could not add gate task.', true);
      return;
    }
    this.staffGateContainer.set('');
    this.showToast('Port gate task added to queue.');
  }

  protected async handleSubmitDealerQuote(): Promise<void> {
    if (!this.quoteClientName().trim() || !this.quoteClientEmail().trim()) {
      this.showToast('Enter client company name and email.', true);
      return;
    }
    const res = await this.cargoData.submitQuoteRequest({
      company: this.quoteClientName().trim(),
      email: this.quoteClientEmail().trim(),
      mode: this.quoteMode(),
      lane: this.quoteLane(),
      notes: this.quoteNotes().trim(),
      rateUsd: Number(this.quoteRateUsd()) || 4650,
      marginPercent: Number(this.quoteMarginPercent()) || 8.5,
    });
    if (!res.ok) {
      this.showToast(res.error ?? 'Could not submit commercial quote.', true);
      return;
    }
    this.quoteClientName.set('');
    this.quoteClientEmail.set('');
    this.quoteNotes.set('');
    this.showDealerQuoteForm.set(false);
    this.showToast(`Created broker quote ${res.quoteRef}.`);
  }

  protected async handleApproveQuote(id: string): Promise<void> {
    const res = await this.cargoData.approveDealerQuote(id);
    this.showToast(res.ok ? `Updated dealer quote ${id}` : (res.error ?? 'Update failed.'));
  }

  protected async handleToggleGateTask(id: string): Promise<void> {
    const res = await this.cargoData.toggleGateTask(id);
    this.showToast(res.ok ? `Updated gate task ${id}` : (res.error ?? 'Update failed.'));
  }

  protected async handlePayInvoice(id: string): Promise<void> {
    const res = await this.cargoData.verifyInvoicePayment(id, 'verified');
    this.showToast(
      res.ok
        ? `Payment verified for ${id} (${res.receiptNumber ?? 'Paid'}).`
        : (res.error ?? 'Verification failed.'),
    );
  }

  protected async handleVerifyPayment(
    id: string,
    decision: 'verified' | 'rejected',
  ): Promise<void> {
    const res = await this.cargoData.verifyInvoicePayment(
      id,
      decision,
      decision === 'rejected' ? 'Payment proof did not clear. Please resubmit.' : undefined,
    );
    this.showToast(
      res.ok
        ? decision === 'verified'
          ? `Verified payment ${id} (${res.receiptNumber ?? 'Paid'}).`
          : `Rejected payment ${id}.`
        : (res.error ?? 'Update failed.'),
    );
  }

  protected async handleTogglePortBerth(code: string): Promise<void> {
    const res = await this.cargoData.togglePortBerthStatus(code);
    this.showToast(res.ok ? `Updated berth status for ${code}` : (res.error ?? 'Update failed.'));
  }

  protected async handleToggleAccountStatus(accountId: string, name: string): Promise<void> {
    const res = await this.auth.toggleAccountStatus(accountId);
    this.showToast(res.ok ? `Updated account access for ${name}` : (res.error ?? 'Update failed.'));
  }

  protected async createStaffAccount(): Promise<void> {
    this.staffError.set('');
    const res = await this.auth.createStaffByAdmin({
      fullName: this.staffFullName(),
      email: this.staffEmail(),
      password: this.staffPassword(),
      organization: this.staffOrg(),
      hubLocode: this.staffHub(),
    });
    if (!res.ok) {
      this.staffError.set(res.error ?? 'Could not create staff account.');
      return;
    }

    const email = this.staffEmail();
    this.staffFullName.set('');
    this.staffEmail.set('');
    this.staffPassword.set('');
    this.showStaffForm.set(false);
    this.showToast(`Staff account created for ${email}.`);
  }

  protected async handleDealerDecision(
    accountId: string,
    name: string,
    decision: 'approved' | 'rejected',
  ): Promise<void> {
    const res = await this.auth.verifyDealer(accountId, decision);
    this.showToast(res.ok ? `Dealer ${name} ${decision}.` : (res.error ?? 'Verification failed.'));
  }

  protected async handleIssueInvoice(shipment: ShipmentRecord): Promise<void> {
    const res = await this.cargoData.issueInvoice(shipment);
    if (!res.ok || !res.invoice) {
      this.showToast(res.error ?? 'Failed to issue invoice.');
      return;
    }
    this.showToast(`Issued ${res.invoice.id} ($${res.invoice.amountUsd.toLocaleString('en-US')}) for ${shipment.trackingId}.`);
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

    if (isPlatformBrowser(this.platformId)) {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BL_${shipment.trackingId}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
    this.showToast(`Exported Digital Bill of Lading for ${shipment.trackingId}.`);
  }
}
