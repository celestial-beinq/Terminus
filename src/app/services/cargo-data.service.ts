import { Injectable } from '@angular/core';

export interface ShipmentMilestone {
  timestamp: string;
  location: string;
  event: string;
  completed: boolean;
}

export interface ShipmentRecord {
  trackingId: string;
  containerNumber: string;
  vessel: string;
  origin: string;
  destination: string;
  eta: string;
  status: 'In Transit' | 'Customs Cleared' | 'At Berth' | 'Delivered';
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

@Injectable({ providedIn: 'root' })
export class CargoDataService {
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
  ];

  findShipment(query: string): ShipmentRecord | undefined {
    const normalized = query.trim().toUpperCase();
    if (!normalized) {
      return undefined;
    }
    return this.shipments.find(
      (item) =>
        item.trackingId.toUpperCase() === normalized ||
        item.containerNumber.toUpperCase().includes(normalized),
    );
  }
}

