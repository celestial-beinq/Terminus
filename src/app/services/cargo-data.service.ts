import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface ShipmentMilestone {
  timestamp: string;
  location: string;
  event: string;
  completed: boolean;
}

export interface ShipmentRecord {
  id?: string;
  trackingId: string;
  containerNumber: string;
  sealNumber?: string;
  vessel: string;
  voyage?: string;
  origin: string;
  destination: string;
  incoterm?: 'EXW' | 'FOB' | 'CIF' | 'DDP';
  vgmKg?: number;
  eta: string;
  lastFreeDay?: string;
  status: 'Booking Confirmed' | 'In Transit' | 'Customs Cleared' | 'At Berth' | 'Delivered';
  cargoType: string;
  teu: string;
  progressPercent: number;
  milestones: ShipmentMilestone[];
}

export interface CargoServiceItem {
  id: string;
  code: string;
  title: string;
  summary: string;
  transitWindow: string;
  capacity: string;
  highlights: string[];
}

export interface CaseStudyItem {
  slug: string;
  client: string;
  sector: string;
  headline: string;
  summary: string;
  impactMetric: string;
  impactLabel: string;
  imageUrl: string;
  highlights: string[];
}

export interface StatMetric {
  value: string;
  label: string;
  detail: string;
}

export interface PortHub {
  code: string;
  name: string;
  country: string;
  corridor: 'Asia → Europe' | 'Trans-Atlantic' | 'Trans-Pacific' | 'Intra-Asia';
  berthStatus: 'Optimal' | 'Moderate Queue';
  avgDwellHours: number;
  weeklySailings: number;
}

export interface ContainerSpec {
  id: string;
  label: string;
  teuCount: number;
  maxPayloadKg: string;
  volumeCbm: string;
  rateMultiplier: number;
}

export interface FreightQuoteResult {
  origin: PortHub;
  destination: PortHub;
  container: ContainerSpec;
  quantity: number;
  transitDays: number;
  oceanFreightUsd: number;
  terminalHandlingUsd: number;
  totalUsd: number;
  co2Tonnes: number;
}

export interface QuoteDraft {
  mode: string;
  lane: string;
  notes: string;
}

export interface WorkflowStep {
  number: string;
  tag: string;
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
}

export interface CountryCorridor {
  country: string;
  code: string;
  ports: string;
  region: string;
  annualTeus: string;
}

export interface TestimonialItem {
  quote: string;
  author: string;
  role: string;
  company: string;
  lane: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface DealerQuoteItem {
  id: string;
  client: string;
  lane: string;
  equipment: string;
  rateUsd: number;
  marginPercent: number;
  status: 'Pending Review' | 'Approved' | 'Dispatched';
}

export interface InvoiceItem {
  id: string;
  shipmentId: string;
  lane: string;
  amountUsd: number;
  dueDate: string;
  status: 'Paid' | 'Due';
}

export interface PortGateTask {
  id: string;
  containerNumber: string;
  terminal: string;
  action: string;
  vessel: string;
  completed: boolean;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  tag: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class CargoDataService {
  private readonly supabase = inject(SupabaseService);
  readonly isRealtimeLive = this.supabase.isLiveConnected;
  readonly lastSyncLabel = signal<string>('Local Simulation');
  readonly stats: StatMetric[] = [
    { value: '140+', label: 'Global Port Terminals', detail: 'Direct berth allocations across 6 continents' },
    { value: '2.4M', label: 'TEUs Moved Annually', detail: 'Dry, reefer, and out-of-gauge container volume' },
    { value: '99.4%', label: 'Schedule Integrity', detail: 'Automated rerouting & port congestion telemetry' },
    { value: '< 15m', label: 'Customs Pre-Clearance', detail: 'Unified manifest & EDI/API border filings' },
  ];

  readonly services: CargoServiceItem[] = [
    {
      id: 'ocean-fcl',
      code: '01 / OCEAN',
      title: 'Full Container Load (FCL)',
      summary: 'Dedicated 20ft, 40ft, and High-Cube container allocations with priority berth windows on major East-West maritime corridors.',
      transitWindow: '14–28 Days Port-to-Port',
      capacity: '20ft / 40ft / 40ft HC',
      highlights: ['Guaranteed carrier space protection', 'Automated bill of lading issuance', 'Real-time AIS vessel telemetry'],
    },
    {
      id: 'ocean-lcl',
      code: '02 / CONSOLIDATION',
      title: 'Less-than-Container (LCL)',
      summary: 'Weekly fixed-day sailing schedules for palletized freight with direct hub-to-hub deconsolidation and zero hidden terminal fees.',
      transitWindow: '18–32 Days Door-to-Port',
      capacity: '1–15 CBM Flexible',
      highlights: ['Weekly fixed departures', 'Barcode-verified hub cross-docking', 'Unified per-CBM transparent pricing'],
    },
    {
      id: 'reefer-cold',
      code: '03 / COLD CHAIN',
      title: 'Temperature-Controlled Reefer',
      summary: 'Active IoT-monitored reefer containers maintaining -30°C to +25°C stability for pharmaceuticals, perishables, and precision chemicals.',
      transitWindow: 'Priority Cold Corridor',
      capacity: '40ft High-Cube Reefer',
      highlights: ['Continuous satellite temp alerts', 'Pre-trip USDA/GDP certification', 'Shore-power berth priority'],
    },
    {
      id: 'multimodal',
      code: '04 / MULTIMODAL',
      title: 'Port-to-Door Intermodal',
      summary: 'Seamless drayage, rail ramp transfers, and inland trucking synchronized with vessel arrival so containers never sit idle in demurrage.',
      transitWindow: 'Same-Day Berth Dispatch',
      capacity: 'Rail + Chassis Fleet',
      highlights: ['Automated chassis & appointment booking', 'Zero-demurrage dwell alerts', 'Single chain-of-custody invoice'],
    },
  ];

  readonly caseStudies: CaseStudyItem[] = [
    {
      slug: 'lumen-logistics',
      client: 'Lumen Logistics™',
      sector: 'Regional Fulfillment & Port Drayage',
      headline: 'Supporting rapid warehouse expansion through unified tracking.',
      summary:
        'Lumen Logistics consolidated 14 regional ocean and inland drayage carriers onto Terminus telemetry, cutting container dwell times at Rotterdam and Savannah by nearly half.',
      impactMetric: '-42%',
      impactLabel: 'Average Container Dwell Time',
      imageUrl: '/images/case-study-operator.jpg',
      highlights: [
        'Unified EDI + AIS tracking across 18,400 annual TEUs',
        'Automated customs pre-clearance prior to vessel berth',
        'Eliminated $1.8M in annual detention & demurrage penalties',
      ],
    },
    {
      slug: 'nordic-coldfreight',
      client: 'Nordic ColdFreight',
      sector: 'Pharmaceutical & Marine Cold Chain',
      headline: 'Zero-excursion cold chain visibility across North Atlantic lanes.',
      summary:
        'By streaming live container thermal telemetry into warehouse dispatch queues, Nordic ColdFreight achieved full GDP compliance across 640 monthly reefer crossings.',
      impactMetric: '99.98%',
      impactLabel: 'Thermal Compliance Rate',
      imageUrl: '/images/hero-cargo-port.jpg',
      highlights: [
        '15-minute satellite temperature & humidity heartbeats',
        'Automated exception routing at Hamburg and Halifax ports',
        'Full audit trail exported directly to ERP systems',
      ],
    },
    {
      slug: 'vanguard-industrial',
      client: 'Vanguard Industrial',
      sector: 'Heavy Manufacturing & Trans-Pacific FCL',
      headline: 'Eliminating port detention across 12,000 annual Pacific containers.',
      summary:
        'Vanguard Industrial automated berth chassis appointments and customs pre-clearance between Singapore and Long Beach, cutting inland handoff delays by 56%.',
      impactMetric: '$1.2M',
      impactLabel: 'Annual Detention Savings',
      imageUrl: '/images/crane-container-lift.jpg',
      highlights: [
        'Direct rail-ramp integration at Long Beach Pier T',
        'Automated 40ft High-Cube space protection during Q4 peaks',
        'Real-time ERP milestone webhooks for plant scheduling',
      ],
    },
  ];

  readonly shipments: ShipmentRecord[] = [
    {
      trackingId: 'TRM-884210',
      containerNumber: 'TRMU 492018-4',
      vessel: 'MV Terminus Horizon (IMO 9841205)',
      origin: 'Port of Shanghai (CNSHA)',
      destination: 'Port of Rotterdam (NLRTM)',
      eta: 'Nov 14, 2026 · 06:30 UTC',
      status: 'In Transit',
      cargoType: '40ft High-Cube · Industrial Robotics',
      teu: '2 TEU',
      progressPercent: 74,
      milestones: [
        { timestamp: 'Oct 22 · 14:10', location: 'Shanghai Yangshan Terminal', event: 'Gate-in & customs export release', completed: true },
        { timestamp: 'Oct 23 · 21:45', location: 'Shanghai Berth 4', event: 'Loaded aboard MV Terminus Horizon', completed: true },
        { timestamp: 'Nov 04 · 09:20', location: 'Suez Maritime Corridor', event: 'Northbound convoy transit cleared', completed: true },
        { timestamp: 'Nov 14 · 06:30', location: 'Rotterdam Maasvlakte II', event: 'Scheduled berth arrival & drayage handoff', completed: false },
      ],
    },
    {
      trackingId: 'TRM-409112',
      containerNumber: 'TRMU 771904-1',
      vessel: 'MV Atlantic Meridian (IMO 9732018)',
      origin: 'Port of Hamburg (DEHAM)',
      destination: 'Port of Savannah (USSAV)',
      eta: 'Nov 11, 2026 · 13:00 UTC',
      status: 'Customs Cleared',
      cargoType: '40ft Reefer (-18°C) · Biopharma',
      teu: '2 TEU',
      progressPercent: 92,
      milestones: [
        { timestamp: 'Oct 29 · 08:05', location: 'Hamburg Eurogate', event: 'Pre-cooled reefer sealed & loaded', completed: true },
        { timestamp: 'Nov 03 · 16:40', location: 'North Atlantic Lane', event: 'Thermal telemetry nominal (-18.1°C)', completed: true },
        { timestamp: 'Nov 10 · 07:15', location: 'Savannah CBP Pre-Clearance', event: 'Electronic customs release approved', completed: true },
        { timestamp: 'Nov 11 · 13:00', location: 'Savannah Garden City Terminal', event: 'Discharge to chassis fleet', completed: false },
      ],
    },
    {
      trackingId: 'TRM-619305',
      containerNumber: 'TRMU 305812-9',
      vessel: 'MV Pacific Vanguard (IMO 9904312)',
      origin: 'Port of Singapore (SGSIN)',
      destination: 'Port of Long Beach (USLGB)',
      eta: 'Nov 10, 2026 · 19:45 UTC',
      status: 'At Berth',
      cargoType: '40ft Dry · Consumer Electronics',
      teu: '2 TEU',
      progressPercent: 98,
      milestones: [
        { timestamp: 'Oct 24 · 11:20', location: 'Singapore Tuas Terminal', event: 'Export manifest verified & loaded', completed: true },
        { timestamp: 'Nov 02 · 04:15', location: 'Mid-Pacific Corridor', event: 'Schedule check passed · 21.4 knots', completed: true },
        { timestamp: 'Nov 10 · 09:30', location: 'Long Beach Pier T', event: 'Vessel berthed · gantry discharge active', completed: true },
        { timestamp: 'Nov 10 · 19:45', location: 'Long Beach Rail Ramp', event: 'Intermodal rail departure window', completed: false },
      ],
    },
  ];

  readonly ports: PortHub[] = [
    {
      code: 'CNSHA',
      name: 'Shanghai Yangshan',
      country: 'China',
      corridor: 'Asia → Europe',
      berthStatus: 'Optimal',
      avgDwellHours: 14,
      weeklySailings: 28,
    },
    {
      code: 'SGSIN',
      name: 'Singapore Tuas',
      country: 'Singapore',
      corridor: 'Intra-Asia',
      berthStatus: 'Optimal',
      avgDwellHours: 11,
      weeklySailings: 34,
    },
    {
      code: 'NLRTM',
      name: 'Rotterdam Maasvlakte II',
      country: 'Netherlands',
      corridor: 'Asia → Europe',
      berthStatus: 'Optimal',
      avgDwellHours: 16,
      weeklySailings: 24,
    },
    {
      code: 'DEHAM',
      name: 'Hamburg Eurogate',
      country: 'Germany',
      corridor: 'Trans-Atlantic',
      berthStatus: 'Moderate Queue',
      avgDwellHours: 22,
      weeklySailings: 18,
    },
    {
      code: 'USSAV',
      name: 'Savannah Garden City',
      country: 'United States',
      corridor: 'Trans-Atlantic',
      berthStatus: 'Optimal',
      avgDwellHours: 15,
      weeklySailings: 19,
    },
    {
      code: 'USLGB',
      name: 'Long Beach Pier T',
      country: 'United States',
      corridor: 'Trans-Pacific',
      berthStatus: 'Moderate Queue',
      avgDwellHours: 21,
      weeklySailings: 22,
    },
  ];

  readonly containerSpecs: ContainerSpec[] = [
    { id: '20-dry', label: '20ft Standard Dry', teuCount: 1, maxPayloadKg: '28,200 kg', volumeCbm: '33.2 CBM', rateMultiplier: 1.0 },
    { id: '40-dry', label: '40ft Standard Dry', teuCount: 2, maxPayloadKg: '26,600 kg', volumeCbm: '67.7 CBM', rateMultiplier: 1.72 },
    { id: '40-hc', label: '40ft High-Cube', teuCount: 2, maxPayloadKg: '26,460 kg', volumeCbm: '76.3 CBM', rateMultiplier: 1.85 },
    { id: '40-reefer', label: '40ft Active Reefer (-18°C)', teuCount: 2, maxPayloadKg: '29,350 kg', volumeCbm: '59.3 CBM', rateMultiplier: 2.45 },
  ];

  readonly workflowSteps: WorkflowStep[] = [
    {
      number: '01',
      tag: 'BOOK & ALLOCATE',
      title: 'Lock vessel space & container equipment',
      description:
        'Select your origin terminal, container class (20ft, 40ft HC, or Active Reefer), and sailing window with guaranteed carrier allocation.',
      imageUrl: '/images/multimodal-freight.jpg',
      imageAlt: 'Multimodal ocean, air, and road cargo equipment',
    },
    {
      number: '02',
      tag: 'GATE-IN & CLEAR',
      title: 'Automated manifests & port crane loading',
      description:
        'Digital Bill of Lading and customs pre-clearance filings transmit automatically before your sealed container reaches the gantry crane.',
      imageUrl: '/images/crane-container-lift.jpg',
      imageAlt: 'Port crane loading red cargo container onto truck chassis',
    },
    {
      number: '03',
      tag: 'OCEAN TRANSIT & AIS',
      title: 'Continuous maritime & thermal telemetry',
      description:
        'Monitor vessel coordinates, speed, weather deviations, and live reefer container temperatures from a single unified manifest.',
      imageUrl: '/images/container-deck-sea.jpg',
      imageAlt: 'Container ship deck loaded with shipping containers crossing ocean',
    },
    {
      number: '04',
      tag: 'DISCHARGE & DRAYAGE',
      title: 'Priority berth discharge to final warehouse',
      description:
        'Pre-booked chassis appointments and rail ramp transfers move freight off the terminal immediately—eliminating demurrage fees.',
      imageUrl: '/images/ocean-vessel-aerial.jpg',
      imageAlt: 'Overhead aerial view of container ship navigating open water',
    },
  ];

  readonly countries: CountryCorridor[] = [
    { country: 'China', code: 'CN', ports: 'Shanghai · Ningbo · Shenzhen', region: 'East Asia', annualTeus: '640K TEU' },
    { country: 'Netherlands', code: 'NL', ports: 'Rotterdam Maasvlakte II', region: 'Western Europe', annualTeus: '410K TEU' },
    { country: 'United States', code: 'US', ports: 'Savannah · Long Beach · Newark', region: 'North America', annualTeus: '520K TEU' },
    { country: 'Singapore', code: 'SG', ports: 'Tuas Mega Port · Pasir Panjang', region: 'Southeast Asia', annualTeus: '380K TEU' },
    { country: 'Germany', code: 'DE', ports: 'Hamburg Eurogate · Bremerhaven', region: 'Central Europe', annualTeus: '215K TEU' },
    { country: 'United Kingdom', code: 'GB', ports: 'Felixstowe · London Gateway', region: 'Northern Europe', annualTeus: '140K TEU' },
    { country: 'United Arab Emirates', code: 'AE', ports: 'Jebel Ali · Khalifa Port', region: 'Middle East', annualTeus: '185K TEU' },
    { country: 'South Korea', code: 'KR', ports: 'Busan New Port · Incheon', region: 'East Asia', annualTeus: '160K TEU' },
    { country: 'Brazil', code: 'BR', ports: 'Santos · Paranaguá', region: 'South America', annualTeus: '95K TEU' },
    { country: 'Japan', code: 'JP', ports: 'Yokohama · Tokyo · Kobe', region: 'East Asia', annualTeus: '130K TEU' },
    { country: 'Canada', code: 'CA', ports: 'Vancouver · Montreal · Halifax', region: 'North America', annualTeus: '110K TEU' },
    { country: 'South Africa', code: 'ZA', ports: 'Durban · Cape Town', region: 'Southern Africa', annualTeus: '78K TEU' },
  ];

  readonly testimonials: TestimonialItem[] = [
    {
      quote:
        'Consolidating our ocean and drayage tracking onto Terminus cut container dwell times at Rotterdam and Savannah by 42% in two quarters.',
      author: 'Elena Rostova',
      role: 'VP of Global Fulfillment',
      company: 'Lumen Logistics™',
      lane: 'Shanghai → Rotterdam',
    },
    {
      quote:
        'Live 15-minute satellite temperature heartbeats gave our QA team complete GDP audit visibility across 640 monthly North Atlantic reefer crossings.',
      author: 'Henrik Lindqvist',
      role: 'Director of Cold Chain',
      company: 'Nordic ColdFreight',
      lane: 'Hamburg → Savannah',
    },
    {
      quote:
        'Automated customs pre-clearance and single-click berth chassis booking eliminated over $1.2M in annual port detention penalties for our plants.',
      author: 'Marcus Vance',
      role: 'Head of Supply Chain',
      company: 'Vanguard Industrial',
      lane: 'Singapore → Long Beach',
    },
  ];

  readonly faqs: FaqItem[] = [
    {
      question: 'How fast can we book container capacity on major East–West lanes?',
      answer:
        'Contracted allocations on Shanghai, Singapore, Rotterdam, Hamburg, Savannah, and Long Beach corridors can be locked within 2 hours of submitting a lane request.',
    },
    {
      question: 'Do you support both FCL and LCL cargo shipments?',
      answer:
        'Yes. You can book dedicated 20ft, 40ft, 40ft High-Cube, and Active Reefer FCL equipment, or reserve weekly fixed-day LCL consolidation starting from 1 CBM.',
    },
    {
      question: 'How does live container monitoring work while vessels are at sea?',
      answer:
        'Terminus combines satellite AIS vessel telemetry, carrier EDI milestone feeds, and IoT reefer sensor heartbeats into a single real-time manifest and webhook API.',
    },
    {
      question: 'Can Terminus connect directly to our ERP or warehouse system?',
      answer:
        'Yes. Our engineering desk provides direct REST webhooks, EDI X12/EDIFACT bridges, and native connectors for SAP, NetSuite, and Manhattan WMS.',
    },
    {
      question: 'How do you prevent port demurrage and detention charges?',
      answer:
        'Customs declarations are pre-cleared while the vessel is still in transit, and inland drayage chassis appointments are triggered automatically upon berth arrival.',
    },
  ];

  readonly quoteDraft = signal<QuoteDraft | null>(null);

  readonly liveShipments = signal<ShipmentRecord[]>(this.shipments);

  readonly dealerQuotes = signal<DealerQuoteItem[]>([
    {
      id: 'DLQ-904',
      client: 'Lumen Logistics™',
      lane: 'Shanghai (CNSHA) → Rotterdam (NLRTM)',
      equipment: '4 × 40ft High-Cube',
      rateUsd: 17940,
      marginPercent: 8.5,
      status: 'Pending Review',
    },
    {
      id: 'DLQ-908',
      client: 'Nordic ColdFreight',
      lane: 'Hamburg (DEHAM) → Savannah (USSAV)',
      equipment: '2 × 40ft Active Reefer',
      rateUsd: 8510,
      marginPercent: 9.2,
      status: 'Approved',
    },
    {
      id: 'DLQ-912',
      client: 'Vanguard Industrial',
      lane: 'Singapore (SGSIN) → Long Beach (USLGB)',
      equipment: '6 × 40ft Standard Dry',
      rateUsd: 23580,
      marginPercent: 7.8,
      status: 'Pending Review',
    },
  ]);

  readonly invoices = signal<InvoiceItem[]>([
    {
      id: 'INV-2026-410',
      shipmentId: 'TRM-884210',
      lane: 'CNSHA → NLRTM',
      amountUsd: 4658,
      dueDate: 'Nov 18, 2026',
      status: 'Due',
    },
    {
      id: 'INV-2026-392',
      shipmentId: 'TRM-409112',
      lane: 'DEHAM → USSAV',
      amountUsd: 4255,
      dueDate: 'Nov 02, 2026',
      status: 'Paid',
    },
  ]);

  readonly gateTasks = signal<PortGateTask[]>([
    {
      id: 'OPS-51',
      containerNumber: 'TRMU 492018-4',
      terminal: 'Rotterdam Maasvlakte II',
      action: 'Pre-clear EU customs manifest & assign drayage slot',
      vessel: 'MV Terminus Horizon',
      completed: false,
    },
    {
      id: 'OPS-52',
      containerNumber: 'TRMU 771904-1',
      terminal: 'Savannah Garden City',
      action: 'Confirm reefer shore-power disconnect & chassis release',
      vessel: 'MV Atlantic Meridian',
      completed: true,
    },
    {
      id: 'OPS-53',
      containerNumber: 'TRMU 305812-9',
      terminal: 'Long Beach Pier T',
      action: 'Verify gantry crane discharge & rail ramp seal',
      vessel: 'MV Pacific Vanguard',
      completed: false,
    },
  ]);

  readonly activityFeed = signal<ActivityEvent[]>([
    {
      id: 'ACT-1',
      timestamp: 'Just now',
      tag: 'AIS SYNC',
      message: 'MV Terminus Horizon cleared Suez corridor · ETA Rotterdam Nov 14',
    },
    {
      id: 'ACT-2',
      timestamp: '14m ago',
      tag: 'CUSTOMS',
      message: 'CBP electronic release approved for TRM-409112 at Savannah',
    },
    {
      id: 'ACT-3',
      timestamp: '42m ago',
      tag: 'BERTH OPS',
      message: 'MV Pacific Vanguard berthed at Long Beach Pier T · gantry active',
    },
  ]);

  readonly livePorts = signal<PortHub[]>(this.ports);

  constructor() {
    void this.initSupabaseSync();
  }

  findShipment(query: string): ShipmentRecord | undefined {
    const normalized = query.trim().toUpperCase();
    if (!normalized) {
      return undefined;
    }
    return this.liveShipments().find(
      (item) =>
        item.trackingId.toUpperCase() === normalized ||
        item.containerNumber.toUpperCase().includes(normalized),
    );
  }

  async lookupShipmentRemote(query: string): Promise<ShipmentRecord | undefined> {
    const local = this.findShipment(query);
    const client = this.supabase.client();
    if (!client || !query.trim()) {
      return local;
    }

    const { data, error } = await client.rpc('lookup_shipment_by_tracking', {
      p_query: query.trim(),
    });

    if (error || !data) {
      return local;
    }

    return data as ShipmentRecord;
  }

  addShipment(
    origin: string,
    destination: string,
    cargoType: string,
    incoterm: 'EXW' | 'FOB' | 'CIF' | 'DDP' = 'CIF',
  ): ShipmentRecord {
    const idNum = Math.floor(100000 + Math.random() * 899999);
    const created: ShipmentRecord = {
      trackingId: `TRM-${idNum}`,
      containerNumber: `TRMU ${Math.floor(100000 + Math.random() * 899999)}-0`,
      sealNumber: `SL-${Math.floor(100000 + Math.random() * 899999)}`,
      vessel: 'MV Terminus Meridian (IMO 9912044)',
      voyage: 'V.264W',
      origin,
      destination,
      incoterm,
      vgmKg: 24800,
      eta: 'Nov 28, 2026 · 08:00 UTC',
      lastFreeDay: 'Dec 03, 2026',
      status: 'Booking Confirmed',
      cargoType,
      teu: '2 TEU',
      progressPercent: 18,
      milestones: [
        { timestamp: 'Nov 10 · 11:00', location: origin, event: 'Booking confirmed & empty container released', completed: true },
        { timestamp: 'Nov 12 · 18:30', location: origin, event: 'Scheduled vessel loading', completed: false },
        { timestamp: 'Nov 28 · 08:00', location: destination, event: 'Estimated berth arrival', completed: false },
      ],
    };

    this.liveShipments.update((list) => [created, ...list]);
    this.recordActivity('BOOKING', `Booked ${created.trackingId} (${origin} → ${destination})`);
    void this.persistNewShipment(created);
    return created;
  }

  advanceShipmentStatus(trackingId: string): void {
    const order: ShipmentRecord['status'][] = [
      'Booking Confirmed',
      'In Transit',
      'Customs Cleared',
      'At Berth',
      'Delivered',
    ];
    const progressMap: Record<ShipmentRecord['status'], number> = {
      'Booking Confirmed': 18,
      'In Transit': 55,
      'Customs Cleared': 78,
      'At Berth': 94,
      Delivered: 100,
    };

    let updatedStatus: ShipmentRecord['status'] | null = null;
    let updatedProgress = 55;
    let shipmentDbId: string | undefined;
    let completedOrderToMark: number | null = null;
    this.liveShipments.update((list) =>
      list.map((item) => {
        if (item.trackingId !== trackingId) {
          return item;
        }
        shipmentDbId = item.id;
        const idx = order.indexOf(item.status);
        const nextStatus = order[(idx + 1) % order.length];
        updatedStatus = nextStatus;
        updatedProgress = progressMap[nextStatus];
        let marked = false;
        const nextMilestones = item.milestones.map((m, mIdx) => {
          if (!marked && !m.completed) {
            marked = true;
            completedOrderToMark = mIdx + 1;
            return { ...m, completed: true };
          }
          return m;
        });
        return {
          ...item,
          status: nextStatus,
          progressPercent: updatedProgress,
          milestones: nextMilestones,
        };
      }),
    );

    if (updatedStatus) {
      this.recordActivity('TELEMETRY', `${trackingId} updated to ${updatedStatus}`);
      const client = this.supabase.client();
      if (client) {
        void client
          .from('shipments')
          .update({
            status: updatedStatus,
            progress_percent: updatedProgress,
            updated_at: new Date().toISOString(),
          })
          .eq('tracking_id', trackingId);

        if (shipmentDbId && completedOrderToMark !== null) {
          void client
            .from('shipment_milestones')
            .update({ completed: true })
            .eq('shipment_id', shipmentDbId)
            .eq('sort_order', completedOrderToMark);
        }
      }
    }
  }

  togglePortBerthStatus(code: string): void {
    let nextStatus: PortHub['berthStatus'] = 'Optimal';
    this.livePorts.update((ports) =>
      ports.map((p) => {
        if (p.code !== code) {
          return p;
        }
        nextStatus = p.berthStatus === 'Optimal' ? 'Moderate Queue' : 'Optimal';
        return { ...p, berthStatus: nextStatus };
      }),
    );
    this.recordActivity('PORT OPS', `Terminal ${code} berth status set to ${nextStatus}`);

    const client = this.supabase.client();
    if (client) {
      void client
        .from('port_hubs')
        .update({ berth_status: nextStatus, updated_at: new Date().toISOString() })
        .eq('code', code);
    }
  }

  async submitQuoteRequest(payload: {
    company: string;
    email: string;
    mode: string;
    lane: string;
    notes: string;
  }): Promise<string> {
    const quoteRef = `TRM-Q${Math.floor(100 + Math.random() * 899)}`;
    const newItem: DealerQuoteItem = {
      id: quoteRef,
      client: payload.company || 'Direct Shipper',
      lane: payload.lane,
      equipment: payload.mode,
      rateUsd: 4658,
      marginPercent: 8.5,
      status: 'Pending Review',
    };

    this.dealerQuotes.update((quotes) => [newItem, ...quotes]);
    this.recordActivity('QUOTE', `New lane inquiry ${quoteRef} from ${newItem.client}`);

    const client = this.supabase.client();
    if (client) {
      await client.from('quote_requests').insert({
        quote_ref: quoteRef,
        client_name: newItem.client,
        contact_email: payload.email,
        freight_mode: payload.mode,
        trade_lane: payload.lane,
        equipment: payload.mode,
        rate_usd: newItem.rateUsd,
        margin_percent: newItem.marginPercent,
        notes: payload.notes,
        status: 'Pending Review',
      });
    }

    return quoteRef;
  }

  approveDealerQuote(id: string): void {
    let nextStatus: DealerQuoteItem['status'] = 'Approved';
    this.dealerQuotes.update((quotes) =>
      quotes.map((q) => {
        if (q.id !== id) {
          return q;
        }
        nextStatus = q.status === 'Pending Review' ? 'Approved' : 'Dispatched';
        return { ...q, status: nextStatus };
      }),
    );
    this.recordActivity('DEALER', `Updated broker quote ${id} → ${nextStatus}`);

    const client = this.supabase.client();
    if (client) {
      void client.from('quote_requests').update({ status: nextStatus }).eq('quote_ref', id);
    }
  }

  payInvoice(id: string): void {
    this.invoices.update((items) =>
      items.map((inv) => (inv.id === id ? { ...inv, status: 'Paid' } : inv)),
    );
    this.recordActivity('BILLING', `Settled freight invoice ${id}`);

    const client = this.supabase.client();
    if (client) {
      void client.from('invoices').update({ status: 'Paid' }).eq('invoice_number', id);
    }
  }

  toggleGateTask(id: string): void {
    let nextCompleted = false;
    this.gateTasks.update((tasks) =>
      tasks.map((t) => {
        if (t.id !== id) {
          return t;
        }
        nextCompleted = !t.completed;
        return { ...t, completed: nextCompleted };
      }),
    );
    this.recordActivity('GATE OPS', `Updated terminal clearance task ${id}`);

    const client = this.supabase.client();
    if (client) {
      void client
        .from('gate_tasks')
        .update({ completed: nextCompleted, updated_at: new Date().toISOString() })
        .eq('task_code', id);
    }
  }

  private recordActivity(tag: string, message: string): void {
    this.activityFeed.update((feed) => [
      {
        id: `ACT-${Date.now()}`,
        timestamp: 'Just now',
        tag,
        message,
      },
      ...feed.slice(0, 5),
    ]);

    const client = this.supabase.client();
    if (client) {
      void client.from('activity_events').insert({ tag, message });
    }
  }

  private async persistNewShipment(created: ShipmentRecord): Promise<void> {
    const client = this.supabase.client();
    if (!client) {
      return;
    }

    const originLocode = this.extractLocode(created.origin, 'CNSHA');
    const destLocode = this.extractLocode(created.destination, 'NLRTM');

    const { data: inserted } = await client
      .from('shipments')
      .insert({
        tracking_id: created.trackingId,
        container_number: created.containerNumber,
        seal_number: created.sealNumber ?? 'SL-904182',
        vessel_name: 'MV Terminus Meridian',
        vessel_imo: 'IMO 9912044',
        voyage_number: created.voyage ?? 'V.264W',
        origin_locode: originLocode,
        destination_locode: destLocode,
        origin_label: created.origin,
        destination_label: created.destination,
        incoterm: created.incoterm ?? 'CIF',
        vgm_kg: created.vgmKg ?? 24800,
        equipment_code: '40HC',
        cargo_type: created.cargoType,
        teu: created.teu,
        status: created.status,
        progress_percent: created.progressPercent,
        eta: created.eta,
        last_free_day: created.lastFreeDay ?? 'Dec 03, 2026',
      })
      .select('id')
      .maybeSingle();

    if (inserted?.id) {
      await client.from('shipment_milestones').insert(
        created.milestones.map((m, idx) => ({
          shipment_id: inserted.id,
          event_code: idx === 0 ? 'BOOKED' : 'SCHEDULED',
          timestamp_label: m.timestamp,
          location: m.location,
          event_description: m.event,
          completed: m.completed,
          sort_order: idx + 1,
        })),
      );
    }
  }

  private extractLocode(text: string, fallback: string): string {
    const match = /\(([A-Z]{5})\)/.exec(text.toUpperCase());
    const code = match?.[1];
    if (code && this.ports.some((p) => p.code === code)) {
      return code;
    }
    return fallback;
  }

  private async initSupabaseSync(): Promise<void> {
    const client = await this.supabase.ensureClient();
    if (!client) {
      return;
    }

    await this.refreshAllFromSupabase();

    client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        void this.refreshAllFromSupabase();
      }
    });

    client
      .channel('terminus-live-ops')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, () => {
        void this.fetchShipmentsFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quote_requests' }, () => {
        void this.fetchQuotesFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        void this.fetchInvoicesFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_tasks' }, () => {
        void this.fetchGateTasksFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_events' }, () => {
        void this.fetchActivityFromSupabase();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.lastSyncLabel.set('Supabase Realtime Live');
        }
      });
  }

  async refreshAllFromSupabase(): Promise<void> {
    await Promise.all([
      this.fetchPortsFromSupabase(),
      this.fetchShipmentsFromSupabase(),
      this.fetchQuotesFromSupabase(),
      this.fetchInvoicesFromSupabase(),
      this.fetchGateTasksFromSupabase(),
      this.fetchActivityFromSupabase(),
    ]);
  }

  private async fetchPortsFromSupabase(): Promise<void> {
    const client = this.supabase.client();
    if (!client) {
      return;
    }
    const { data } = await client.from('port_hubs').select('*').order('code');
    if (data && data.length > 0) {
      this.livePorts.set(
        data.map((row) => ({
          code: row.code,
          name: row.name,
          country: row.country,
          corridor: row.corridor,
          berthStatus: row.berth_status,
          avgDwellHours: row.avg_dwell_hours,
          weeklySailings: row.weekly_sailings,
        })),
      );
    }
  }

  private async fetchShipmentsFromSupabase(): Promise<void> {
    const client = this.supabase.client();
    if (!client) {
      return;
    }
    const { data } = await client
      .from('shipments')
      .select('*, shipment_milestones(*)')
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      this.liveShipments.set(
        data.map((row) => ({
          id: row.id,
          trackingId: row.tracking_id,
          containerNumber: row.container_number,
          sealNumber: row.seal_number,
          vessel: `${row.vessel_name} (${row.vessel_imo})`,
          voyage: row.voyage_number,
          origin: row.origin_label,
          destination: row.destination_label,
          incoterm: row.incoterm,
          vgmKg: row.vgm_kg,
          eta: row.eta,
          lastFreeDay: row.last_free_day,
          status: row.status,
          cargoType: row.cargo_type,
          teu: row.teu,
          progressPercent: row.progress_percent,
          milestones: ((row.shipment_milestones as any[]) ?? [])
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((m) => ({
              timestamp: m.timestamp_label,
              location: m.location,
              event: m.event_description,
              completed: m.completed,
            })),
        })),
      );
    }
  }

  private async fetchQuotesFromSupabase(): Promise<void> {
    const client = this.supabase.client();
    if (!client) {
      return;
    }
    const { data } = await client
      .from('quote_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      this.dealerQuotes.set(
        data.map((row) => ({
          id: row.quote_ref,
          client: row.client_name,
          lane: row.trade_lane,
          equipment: row.equipment,
          rateUsd: row.rate_usd,
          marginPercent: Number(row.margin_percent),
          status: row.status,
        })),
      );
    }
  }

  private async fetchInvoicesFromSupabase(): Promise<void> {
    const client = this.supabase.client();
    if (!client) {
      return;
    }
    const { data } = await client
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      this.invoices.set(
        data.map((row) => ({
          id: row.invoice_number,
          shipmentId: row.shipment_tracking_id,
          lane: row.lane,
          amountUsd: row.amount_usd,
          dueDate: row.due_date,
          status: row.status,
        })),
      );
    }
  }

  private async fetchGateTasksFromSupabase(): Promise<void> {
    const client = this.supabase.client();
    if (!client) {
      return;
    }
    const { data } = await client
      .from('gate_tasks')
      .select('*')
      .order('task_code');

    if (data && data.length > 0) {
      this.gateTasks.set(
        data.map((row) => ({
          id: row.task_code,
          containerNumber: row.container_number,
          terminal: row.terminal_name,
          vessel: row.vessel_name,
          action: row.action_required,
          completed: row.completed,
        })),
      );
    }
  }

  private async fetchActivityFromSupabase(): Promise<void> {
    const client = this.supabase.client();
    if (!client) {
      return;
    }
    const { data } = await client
      .from('activity_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(8);

    if (data && data.length > 0) {
      this.activityFeed.set(
        data.map((row) => ({
          id: row.id,
          timestamp: new Date(row.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          tag: row.tag,
          message: row.message,
        })),
      );
    }
  }

  calculateFreightQuote(
    originCode: string,
    destinationCode: string,
    containerId: string,
    quantity: number,
  ): FreightQuoteResult | null {
    const origin = this.ports.find((p) => p.code === originCode);
    const destination = this.ports.find((p) => p.code === destinationCode);
    const container = this.containerSpecs.find((c) => c.id === containerId);
    const qty = Math.max(1, Math.min(50, Math.round(quantity || 1)));

    if (!origin || !destination || !container || origin.code === destination.code) {
      return null;
    }

    const baseRoute = this.lookupBaseRoute(origin.code, destination.code);
    const oceanFreightUsd = Math.round(baseRoute.baseUsd * container.rateMultiplier * qty);
    const terminalHandlingUsd = Math.round(340 * container.teuCount * qty);

    return {
      origin,
      destination,
      container,
      quantity: qty,
      transitDays: baseRoute.days,
      oceanFreightUsd,
      terminalHandlingUsd,
      totalUsd: oceanFreightUsd + terminalHandlingUsd,
      co2Tonnes: Number((baseRoute.co2PerTeu * container.teuCount * qty).toFixed(2)),
    };
  }

  setQuoteDraft(draft: QuoteDraft): void {
    this.quoteDraft.set(draft);
  }

  private lookupBaseRoute(originCode: string, destCode: string): { baseUsd: number; days: number; co2PerTeu: number } {
    const pair = [originCode, destCode].sort().join('-');
    const routeTable: Record<string, { baseUsd: number; days: number; co2PerTeu: number }> = {
      'CNSHA-NLRTM': { baseUsd: 2150, days: 24, co2PerTeu: 1.42 },
      'CNSHA-DEHAM': { baseUsd: 2240, days: 26, co2PerTeu: 1.48 },
      'CNSHA-USLGB': { baseUsd: 1980, days: 15, co2PerTeu: 1.15 },
      'CNSHA-USSAV': { baseUsd: 2680, days: 29, co2PerTeu: 1.68 },
      'NLRTM-SGSIN': { baseUsd: 1940, days: 21, co2PerTeu: 1.24 },
      'DEHAM-SGSIN': { baseUsd: 2020, days: 23, co2PerTeu: 1.31 },
      'SGSIN-USLGB': { baseUsd: 1890, days: 18, co2PerTeu: 1.22 },
      'SGSIN-USSAV': { baseUsd: 2540, days: 27, co2PerTeu: 1.59 },
      'DEHAM-USSAV': { baseUsd: 1460, days: 12, co2PerTeu: 0.84 },
      'NLRTM-USSAV': { baseUsd: 1410, days: 11, co2PerTeu: 0.79 },
      'DEHAM-USLGB': { baseUsd: 2350, days: 24, co2PerTeu: 1.52 },
      'NLRTM-USLGB': { baseUsd: 2290, days: 23, co2PerTeu: 1.47 },
      'CNSHA-SGSIN': { baseUsd: 780, days: 6, co2PerTeu: 0.42 },
      'DEHAM-NLRTM': { baseUsd: 520, days: 2, co2PerTeu: 0.18 },
      'USLGB-USSAV': { baseUsd: 1620, days: 14, co2PerTeu: 0.94 },
    };

    return routeTable[pair] ?? { baseUsd: 1950, days: 20, co2PerTeu: 1.25 };
  }
}

