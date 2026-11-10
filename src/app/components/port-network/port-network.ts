import { Component, computed, inject, signal } from '@angular/core';
import { CargoDataService } from '../../services/cargo-data.service';

@Component({
  selector: 'app-port-network',
  template: `
    <div class="network-header">
      <div>
        <div class="kicker">
          <span class="kicker-plus">+</span>
          <span>Live Terminal Network</span>
        </div>
        <h2>Direct berth allocations &amp; port dwell status</h2>
      </div>

      <div class="corridor-tabs" role="tablist" aria-label="Filter ports by corridor">
        @for (corridor of corridors; track corridor) {
          <button
            type="button"
            role="tab"
            class="corridor-tab"
            [class.is-active]="selectedCorridor() === corridor"
            [attr.aria-selected]="selectedCorridor() === corridor"
            (click)="selectedCorridor.set(corridor)"
          >
            {{ corridor }}
          </button>
        }
      </div>
    </div>

    <div class="ports-grid">
      @for (port of filteredPorts(); track port.code) {
        <article class="port-card">
          <div class="port-top">
            <span class="port-code">{{ port.code }}</span>
            <span
              class="port-status"
              [class.is-optimal]="port.berthStatus === 'Optimal'"
            >
              {{ port.berthStatus }}
            </span>
          </div>
          <h3>{{ port.name }}</h3>
          <p class="port-country">{{ port.country }} · {{ port.corridor }}</p>
          <div class="port-metrics">
            <div>
              <span>Avg Dwell</span>
              <strong>{{ port.avgDwellHours }}h</strong>
            </div>
            <div>
              <span>Weekly Sailings</span>
              <strong>{{ port.weeklySailings }}</strong>
            </div>
          </div>
        </article>
      }
    </div>
  `,
  styles: [
    `
      .network-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 24px;
        flex-wrap: wrap;
        margin-bottom: 32px;
      }

      .network-header h2 {
        margin: 10px 0 0;
        font-size: clamp(24px, 3vw, 34px);
        letter-spacing: -0.025em;
      }

      .corridor-tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .corridor-tab {
        padding: 8px 14px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.16);
        background: transparent;
        color: rgba(255, 255, 255, 0.78);
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all var(--transition-fast);
      }

      .corridor-tab.is-active,
      .corridor-tab:hover {
        background: #ffffff;
        color: #111317;
        border-color: #ffffff;
      }

      .ports-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 20px;
      }

      .port-card {
        padding: 24px;
        background: var(--bg-surface);
        border: 1px solid var(--border-dark);
        border-radius: var(--radius-md);
      }

      .port-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 14px;
      }

      .port-code {
        font-family: var(--font-brand);
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.1em;
        color: var(--accent-coral);
      }

      .port-status {
        font-size: 11.5px;
        font-weight: 600;
        padding: 3px 9px;
        border-radius: 999px;
        background: rgba(245, 158, 11, 0.16);
        color: #fbbf24;
      }

      .port-status.is-optimal {
        background: rgba(34, 197, 94, 0.16);
        color: #4ade80;
      }

      .port-card h3 {
        margin: 0 0 4px;
        font-size: 19px;
        color: #ffffff;
      }

      .port-country {
        margin: 0 0 18px;
        font-size: 13px;
        color: var(--text-muted-dark);
      }

      .port-metrics {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        padding-top: 14px;
        border-top: 1px solid var(--border-dark);
      }

      .port-metrics span {
        display: block;
        font-size: 11.5px;
        color: var(--text-muted-dark);
      }

      .port-metrics strong {
        font-family: var(--font-brand);
        font-size: 20px;
        color: #ffffff;
      }

      @media (max-width: 900px) {
        .ports-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 560px) {
        .ports-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class PortNetwork {
  private readonly ports = inject(CargoDataService).livePorts;

  protected readonly corridors = [
    'All Hubs',
    'Asia → Europe',
    'Trans-Atlantic',
    'Trans-Pacific',
    'Intra-Asia',
  ] as const;

  protected readonly selectedCorridor = signal<string>('All Hubs');

  protected readonly filteredPorts = computed(() => {
    const corridor = this.selectedCorridor();
    const list = this.ports();
    if (corridor === 'All Hubs') {
      return list;
    }
    return list.filter((port) => port.corridor === corridor);
  });
}

