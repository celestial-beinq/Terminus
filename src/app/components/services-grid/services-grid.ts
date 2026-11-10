import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CargoDataService } from '../../services/cargo-data.service';

@Component({
  selector: 'app-services-grid',
  imports: [RouterLink],
  template: `
    <div class="services-grid">
      @for (service of services; track service.id) {
        <article class="service-card">
          <div class="service-top">
            <span class="service-code">{{ service.code }}</span>
            <span class="service-cap">{{ service.capacity }}</span>
          </div>
          <h3 class="service-title">{{ service.title }}</h3>
          <p class="service-summary">{{ service.summary }}</p>
          <ul class="service-list">
            @for (item of service.highlights; track item) {
              <li>{{ item }}</li>
            }
          </ul>
          <div class="service-footer">
            <span class="service-window">{{ service.transitWindow }}</span>
            <a routerLink="/contact" class="service-link">Book Lane →</a>
          </div>
        </article>
      }
    </div>
  `,
  styles: [
    `
      .services-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 24px;
      }

      .service-card {
        display: flex;
        flex-direction: column;
        padding: 32px;
        background-color: #ffffff;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        transition: border-color var(--transition-fast), transform var(--transition-fast);
      }

      .service-card:hover {
        border-color: rgba(17, 19, 23, 0.24);
        transform: translateY(-2px);
      }

      .service-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 16px;
      }

      .service-code {
        font-family: var(--font-brand);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.1em;
        color: var(--accent-coral);
      }

      .service-cap {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-secondary);
        background: #f3f4f6;
        padding: 4px 10px;
        border-radius: 999px;
      }

      .service-title {
        margin: 0 0 10px;
        font-size: 22px;
        font-weight: 600;
        letter-spacing: -0.02em;
      }

      .service-summary {
        margin: 0 0 20px;
        font-size: 14.5px;
        line-height: 1.6;
        color: var(--text-secondary);
      }

      .service-list {
        margin: 0 0 24px;
        padding: 0 0 0 18px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 13.5px;
        color: var(--text-primary);
      }

      .service-footer {
        margin-top: auto;
        padding-top: 18px;
        border-top: 1px solid var(--border-subtle);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .service-window {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-secondary);
      }

      .service-link {
        font-size: 13.5px;
        font-weight: 600;
        color: #141518;
        text-decoration: underline;
        text-underline-offset: 4px;
      }

      @media (max-width: 780px) {
        .services-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ServicesGrid {
  protected readonly services = inject(CargoDataService).services;
}

