import { Component, inject } from '@angular/core';
import { CargoDataService } from '../../services/cargo-data.service';

@Component({
  selector: 'app-stats-strip',
  template: `
    <section class="stats-strip" aria-label="Operational Metrics">
      <div class="container stats-grid">
        @for (stat of stats; track stat.label; let idx = $index) {
          <div class="stat-item" data-aos="fade-up" [attr.data-aos-delay]="idx * 100">
            <span class="stat-value">{{ stat.value }}</span>
            <span class="stat-label">{{ stat.label }}</span>
            <span class="stat-detail">{{ stat.detail }}</span>
          </div>
        }
      </div>
    </section>
  `,
  styles: [
    `
      .stats-strip {
        background-color: var(--bg-surface);
        color: var(--text-on-dark);
        border-top: 1px solid var(--border-dark);
        border-bottom: 1px solid var(--border-dark);
        padding: 40px 0;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 28px;
      }

      .stat-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding-right: 16px;
        border-right: 1px solid var(--border-dark);
      }

      .stat-item:last-child {
        border-right: 0;
      }

      .stat-value {
        font-family: var(--font-brand);
        font-size: clamp(28px, 3vw, 38px);
        font-weight: 700;
        letter-spacing: -0.02em;
        color: #ffffff;
      }

      .stat-label {
        font-size: 13.5px;
        font-weight: 600;
        color: #f1f3f5;
      }

      .stat-detail {
        font-size: 12.5px;
        color: var(--text-muted-dark);
      }

      @media (max-width: 900px) {
        .stats-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .stat-item {
          border-right: 0;
          padding-right: 0;
        }
      }

      @media (max-width: 520px) {
        .stats-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class StatsStrip {
  protected readonly stats = inject(CargoDataService).stats;
}

