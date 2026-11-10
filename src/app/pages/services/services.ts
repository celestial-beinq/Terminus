import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ServicesGrid } from '../../components/services-grid/services-grid';

@Component({
  selector: 'app-services-page',
  imports: [ServicesGrid, RouterLink],
  template: `
    <section class="page-header-band">
      <div class="container">
        <div class="kicker">
          <span class="kicker-plus">+</span>
          <span>Cargo Services</span>
        </div>
        <h1>Ocean, reefer &amp; multimodal freight lanes</h1>
        <p>
          Contracted container capacity, automated customs clearance, and port-to-door
          intermodal execution backed by 24/7 dispatch telemetry.
        </p>
      </div>
    </section>

    <section class="section-muted">
      <div class="container">
        <app-services-grid />

        <div class="specs-box">
          <div>
            <h3>Standard Container Equipment</h3>
            <p>20ft Dry (33.2 CBM) · 40ft Dry (67.7 CBM) · 40ft High-Cube (76.3 CBM) · 40ft Active Reefer</p>
          </div>
          <a routerLink="/contact" class="btn btn-dark">Request Lane Quote</a>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .specs-box {
        margin-top: 32px;
        padding: 28px 32px;
        background: #ffffff;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        flex-wrap: wrap;
      }

      .specs-box h3 {
        margin: 0 0 6px;
        font-size: 18px;
      }

      .specs-box p {
        margin: 0;
        font-size: 14px;
        color: var(--text-secondary);
      }
    `,
  ],
})
export class ServicesPage {}

