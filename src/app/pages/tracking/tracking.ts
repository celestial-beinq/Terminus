import { Component } from '@angular/core';
import { ShipmentTrackerBar } from '../../components/shipment-tracker-bar/shipment-tracker-bar';

@Component({
  selector: 'app-tracking-page',
  imports: [ShipmentTrackerBar],
  template: `
    <section class="page-header-band">
      <div class="container">
        <div class="kicker">
          <span class="kicker-plus">+</span>
          <span>Container &amp; Vessel Tracking</span>
        </div>
        <h1>Real-time shipment telemetry &amp; port milestones</h1>
        <p>
          Query any Bill of Lading or ISO container number for live AIS transit status,
          customs release timestamps, and estimated berth arrival.
        </p>
      </div>
    </section>

    <section class="section-muted">
      <div class="container">
        <app-shipment-tracker-bar />
      </div>
    </section>
  `,
})
export class TrackingPage {}

