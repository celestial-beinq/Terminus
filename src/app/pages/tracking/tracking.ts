import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ShipmentTrackerBar } from '../../components/shipment-tracker-bar/shipment-tracker-bar';
import { PortNetwork } from '../../components/port-network/port-network';
import { CargoDataService } from '../../services/cargo-data.service';

@Component({
  selector: 'app-tracking-page',
  imports: [ShipmentTrackerBar, PortNetwork],
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
        <app-shipment-tracker-bar [initialTrackingId]="selectedTrackingId()" />

        <div class="manifest-panel">
          <div class="manifest-head">
            <div>
              <h3>Active Vessel Manifests</h3>
              <p>Click any container row below to inspect its live milestones above.</p>
            </div>
            <div class="manifest-filters" role="tablist" aria-label="Filter shipments by status">
              @for (status of statuses; track status) {
                <button
                  type="button"
                  role="tab"
                  class="filter-btn"
                  [class.is-active]="statusFilter() === status"
                  (click)="statusFilter.set(status)"
                >
                  {{ status }}
                </button>
              }
            </div>
          </div>

          @if (filteredShipments().length === 0) {
            <p class="empty-manifest">
              Sign in via the Portal to inspect your account manifests, or query any Bill of Lading ID (e.g. <code>TRM-884210</code>) in the lookup bar above.
            </p>
          } @else {
            <div class="manifest-table-wrap">
              <table class="manifest-table">
                <thead>
                  <tr>
                    <th>Tracking ID</th>
                    <th>Container</th>
                    <th>Vessel</th>
                    <th>Route</th>
                    <th>Status</th>
                    <th>ETA</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of filteredShipments(); track item.trackingId) {
                    <tr
                      [class.is-selected]="selectedTrackingId() === item.trackingId"
                      (click)="selectedTrackingId.set(item.trackingId)"
                    >
                      <td class="mono-id">{{ item.trackingId }}</td>
                      <td>{{ item.containerNumber }}</td>
                      <td>{{ item.vessel }}</td>
                      <td>{{ item.origin }} → {{ item.destination }}</td>
                      <td><span class="pill-status">{{ item.status }}</span></td>
                      <td>{{ item.eta }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>
    </section>

    <section class="section-dark">
      <div class="container">
        <app-port-network />
      </div>
    </section>
  `,
  styles: [
    `
      .manifest-panel {
        margin-top: 28px;
        background: #ffffff;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        padding: 28px;
      }

      .manifest-head {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
        margin-bottom: 20px;
      }

      .manifest-head h3 {
        margin: 0 0 4px;
        font-size: 20px;
      }

      .manifest-head p {
        margin: 0;
        font-size: 13.5px;
        color: var(--text-secondary);
      }

      .manifest-filters {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .filter-btn {
        padding: 7px 12px;
        border-radius: 999px;
        border: 1px solid rgba(17, 19, 23, 0.14);
        background: #f6f7f9;
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer;
      }

      .filter-btn.is-active {
        background: #141518;
        color: #ffffff;
        border-color: #141518;
      }

      .manifest-table-wrap {
        width: 100%;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      .manifest-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }

      .manifest-table th {
        text-align: left;
        padding: 10px;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-secondary);
        border-bottom: 1px solid var(--border-subtle);
        white-space: nowrap;
        vertical-align: middle;
      }

      .manifest-table td {
        padding: 12px 10px;
        border-bottom: 1px solid var(--border-subtle);
        white-space: nowrap;
        vertical-align: middle;
      }

      .manifest-table tbody tr {
        cursor: pointer;
        transition: background-color var(--transition-fast);
      }

      .manifest-table tbody tr:hover,
      .manifest-table tbody tr.is-selected {
        background: #f4f6f9;
      }

      .mono-id {
        font-family: var(--font-brand);
        font-weight: 700;
        color: var(--accent-coral);
      }

      .pill-status {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 999px;
        background: #141518;
        color: #ffffff;
        font-size: 11.5px;
        font-weight: 600;
        white-space: nowrap;
      }

      .empty-manifest {
        margin: 0;
        font-size: 13.5px;
        color: var(--text-secondary);
      }
    `,
  ],
})
export class TrackingPage {
  private readonly shipments = inject(CargoDataService).liveShipments;
  private readonly route = inject(ActivatedRoute);

  protected readonly statuses = ['All', 'In Transit', 'Customs Cleared', 'At Berth', 'Delivered'] as const;
  protected readonly statusFilter = signal<string>('All');
  protected readonly selectedTrackingId = signal<string>('TRM-884210');

  constructor() {
    const queryId = this.route.snapshot.queryParamMap.get('id');
    if (queryId) {
      this.selectedTrackingId.set(queryId);
    }
  }

  protected readonly filteredShipments = computed(() => {
    const active = this.statusFilter();
    const list = this.shipments();
    if (active === 'All') {
      return list;
    }
    return list.filter((s) => s.status === active);
  });
}
