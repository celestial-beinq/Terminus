import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CargoDataService } from '../../services/cargo-data.service';

@Component({
  selector: 'app-case-studies-page',
  imports: [RouterLink],
  template: `
    <section class="page-header-band">
      <div class="container">
        <div class="kicker">
          <span class="kicker-plus">+</span>
          <span>Customer Operations</span>
        </div>
        <h1>Enterprise freight rollouts &amp; measurable port velocity</h1>
        <p>
          How regional fulfillment networks and cold-chain carriers deploy Terminus to
          reduce container dwell time and automate customs handoffs.
        </p>
      </div>
    </section>

    <section class="section-muted">
      <div class="container cases-list">
        @for (item of caseStudies; track item.slug) {
          <article class="case-article">
            <img [src]="item.imageUrl" [alt]="item.client" class="case-article-img" />
            <div class="case-article-body">
              <div class="case-article-meta">
                <span class="case-client-tag">{{ item.client }}</span>
                <span class="case-sector">{{ item.sector }}</span>
              </div>
              <h2>{{ item.headline }}</h2>
              <p>{{ item.summary }}</p>
              <ul class="case-highlights">
                @for (point of item.highlights; track point) {
                  <li>{{ point }}</li>
                }
              </ul>
              <div class="case-footer">
                <div class="case-metric">
                  <strong>{{ item.impactMetric }}</strong>
                  <span>{{ item.impactLabel }}</span>
                </div>
                <a routerLink="/contact" class="btn btn-dark">Deploy Similar Stack</a>
              </div>
            </div>
          </article>
        }
      </div>
    </section>
  `,
  styles: [
    `
      .cases-list {
        display: flex;
        flex-direction: column;
        gap: 28px;
      }

      .case-article {
        display: grid;
        grid-template-columns: 320px 1fr;
        background: #ffffff;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        overflow: hidden;
      }

      .case-article-img {
        width: 100%;
        height: 100%;
        min-height: 260px;
        object-fit: cover;
      }

      .case-article-body {
        padding: 32px;
        display: flex;
        flex-direction: column;
      }

      .case-article-meta {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 10px;
      }

      .case-client-tag {
        font-family: var(--font-brand);
        font-size: 13px;
        font-weight: 700;
        color: var(--accent-coral);
      }

      .case-sector {
        font-size: 12.5px;
        color: var(--text-secondary);
      }

      .case-article-body h2 {
        margin: 0 0 12px;
        font-size: 24px;
        letter-spacing: -0.02em;
      }

      .case-article-body p {
        margin: 0 0 18px;
        color: var(--text-secondary);
        line-height: 1.6;
      }

      .case-highlights {
        margin: 0 0 24px;
        padding-left: 18px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 14px;
      }

      .case-footer {
        margin-top: auto;
        padding-top: 20px;
        border-top: 1px solid var(--border-subtle);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
      }

      .case-metric {
        display: flex;
        flex-direction: column;
      }

      .case-metric strong {
        font-family: var(--font-brand);
        font-size: 28px;
        line-height: 1;
      }

      .case-metric span {
        font-size: 12.5px;
        color: var(--text-secondary);
        margin-top: 4px;
      }

      @media (max-width: 820px) {
        .case-article {
          grid-template-columns: 1fr;
        }

        .case-article-img {
          max-height: 240px;
        }
      }
    `,
  ],
})
export class CaseStudiesPage {
  protected readonly caseStudies = inject(CargoDataService).caseStudies;
}

