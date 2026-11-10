import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService, UserRole } from '../../services/auth.service';
import { CargoDataService, ShipmentRecord } from '../../services/cargo-data.service';
import { FreightCalculator } from '../../components/freight-calculator/freight-calculator';
import { PortNetwork } from '../../components/port-network/port-network';

type DashboardTab = 'overview' | 'shipments' | 'workspace' | 'ports';

interface KpiCard {
  label: string;
  value: string;
  delta: string;
}

@Component({
  selector: 'app-dashboard-page',
  imports: [CurrencyPipe, FormsModule, FreightCalculator, PortNetwork],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardPage implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly cargoData = inject(CargoDataService);

  ngOnInit(): void {
    void this.cargoData.refreshAllFromSupabase();
  }

  protected readonly activeTab = signal<DashboardTab>('overview');
  protected readonly roles: UserRole[] = ['customer', 'dealer', 'staff', 'admin'];

  protected readonly searchQuery = signal('');
  protected readonly statusFilter = signal<string>('All');
  protected readonly selectedShipmentId = signal<string>('TRM-884210');

  protected readonly showBookingForm = signal(false);
  protected readonly newOrigin = signal('Port of Shanghai (CNSHA)');
  protected readonly newDestination = signal('Port of Rotterdam (NLRTM)');
  protected readonly newCargoType = signal('40ft High-Cube · Precision Machinery');
  protected readonly newIncoterm = signal<'EXW' | 'FOB' | 'CIF' | 'DDP'>('CIF');

  protected readonly user = this.auth.currentUser;
  protected readonly shipments = this.cargoData.liveShipments;
  protected readonly dealerQuotes = this.cargoData.dealerQuotes;
  protected readonly invoices = this.cargoData.invoices;
  protected readonly gateTasks = this.cargoData.gateTasks;
  protected readonly activityFeed = this.cargoData.activityFeed;
  protected readonly accounts = this.auth.managedAccounts;
  protected readonly toastMessage = signal<string | null>(null);

  protected readonly corridorBars = [
    { lane: 'CNSHA → NLRTM', teus: 640, percent: 92 },
    { lane: 'SGSIN → USLGB', teus: 510, percent: 74 },
    { lane: 'DEHAM → USSAV', teus: 390, percent: 58 },
    { lane: 'CNSHA → USLGB', teus: 465, percent: 68 },
  ];

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
    const count = this.shipments().length;
    const role = this.auth.currentRole() ?? 'customer';

    switch (role) {
      case 'dealer':
        return [
          { label: 'Client Allocations', value: `${count * 14} TEU`, delta: '+12% this month' },
          { label: 'Pending Broker Quotes', value: `${this.dealerQuotes().filter((q) => q.status === 'Pending Review').length}`, delta: 'Avg 8.5% margin' },
          { label: 'Projected Commission', value: '$4,252', delta: 'Monthly settlement' },
          { label: 'Carrier Space Score', value: '99.4%', delta: 'Protected slots' },
        ];
      case 'staff':
        return [
          { label: 'Open Gate Tasks', value: `${this.gateTasks().filter((t) => !t.completed).length}`, delta: 'Active berth queue' },
          { label: 'Vessels In Corridor', value: `${count}`, delta: 'AIS telemetry live' },
          { label: 'Avg Terminal Dwell', value: '14.2h', delta: '-4.1h vs target' },
          { label: 'Reefer Compliance', value: '99.98%', delta: '-18.1°C nominal' },
        ];
      case 'admin':
        return [
          { label: 'Active Network TEUs', value: '18,420', delta: 'Across 48 countries' },
          { label: 'Active Accounts', value: `${this.accounts().filter((a) => a.active).length} / ${this.accounts().length}`, delta: '4 role tiers' },
          { label: 'Monthly Freight Volume', value: '$2.84M', delta: '+18.4% YoY' },
          { label: 'EDI & AIS Uptime', value: '99.99%', delta: 'All feeds operational' },
        ];
      default:
        return [
          { label: 'Active Shipments', value: `${count}`, delta: 'Real-time AIS active' },
          { label: 'Schedule Integrity', value: '99.4%', delta: 'On-time berth ETA' },
          { label: 'Invoices Due', value: `${this.invoices().filter((i) => i.status === 'Due').length}`, delta: '$4,658 pending' },
          { label: 'Avg Dwell Savings', value: '-42%', delta: 'Pre-cleared customs' },
        ];
    }
  });

  protected readonly filteredShipments = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();

    return this.shipments().filter((s) => {
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

  protected readonly selectedShipment = computed<ShipmentRecord | undefined>(() =>
    this.shipments().find((s) => s.trackingId === this.selectedShipmentId()) ?? this.shipments()[0],
  );

  protected readonly canManageShipments = computed(() => {
    const role = this.auth.currentRole();
    return role === 'staff' || role === 'admin';
  });

  protected createBooking(): void {
    const created = this.cargoData.addShipment(
      this.newOrigin(),
      this.newDestination(),
      this.newCargoType(),
      this.newIncoterm(),
    );
    this.selectedShipmentId.set(created.trackingId);
    this.showBookingForm.set(false);
    this.activeTab.set('shipments');
    this.showToast(`Booking ${created.trackingId} (${created.incoterm}) created.`);
  }

  protected inspectShipment(trackingId: string): void {
    this.selectedShipmentId.set(trackingId);
    this.activeTab.set('shipments');
  }

  protected showToast(message: string): void {
    this.toastMessage.set(message);
  }
}

