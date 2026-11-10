import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CargoDataService } from '../../services/cargo-data.service';

@Component({
  selector: 'app-faq-section',
  imports: [RouterLink],
  template: `
    <section class="section-light" aria-label="Frequently Asked Questions">
      <div class="container faq-layout">
        <div class="faq-intro" data-aos="fade-right">
          <div class="kicker">
            <span class="kicker-plus">+</span>
            <span>Frequently Asked Questions</span>
          </div>
          <h2>Everything shippers ask before moving their first lane</h2>
          <p>
            Need custom EDI integration, bonded cold-chain warehousing, or dedicated
            vessel space protection?
          </p>
          <a routerLink="/contact" class="btn btn-dark">Ask Our Operations Desk</a>
        </div>

        <div class="faq-list">
          @for (item of faqs; track item.question; let idx = $index) {
            <div
              class="faq-item"
              data-aos="fade-left"
              [attr.data-aos-delay]="idx * 75"
              [class.is-open]="openIndex() === idx"
            >
              <button
                type="button"
                class="faq-trigger"
                [attr.aria-expanded]="openIndex() === idx"
                (click)="toggle(idx)"
              >
                <span>{{ item.question }}</span>
                <span class="faq-icon" aria-hidden="true">{{ openIndex() === idx ? '−' : '+' }}</span>
              </button>

              @if (openIndex() === idx) {
                <p class="faq-answer">{{ item.answer }}</p>
              }
            </div>
          }
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .faq-layout {
        display: grid;
        grid-template-columns: 0.85fr 1.15fr;
        gap: 48px;
        align-items: start;
      }

      .faq-intro h2 {
        margin: 10px 0 14px;
        font-size: clamp(26px, 3vw, 36px);
        line-height: 1.12;
        letter-spacing: -0.025em;
      }

      .faq-intro p {
        margin: 0 0 24px;
        color: var(--text-secondary);
        line-height: 1.6;
      }

      .faq-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .faq-item {
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        background: #fafbfc;
        overflow: hidden;
      }

      .faq-item.is-open {
        background: #ffffff;
        border-color: rgba(17, 19, 23, 0.2);
      }

      .faq-trigger {
        width: 100%;
        padding: 18px 20px;
        background: transparent;
        border: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        text-align: left;
        font-size: 15px;
        font-weight: 600;
        color: var(--text-primary);
        cursor: pointer;
      }

      .faq-icon {
        font-family: var(--font-brand);
        font-size: 18px;
        color: var(--accent-coral);
        flex-shrink: 0;
      }

      .faq-answer {
        margin: 0;
        padding: 0 20px 18px;
        font-size: 14px;
        line-height: 1.6;
        color: var(--text-secondary);
      }

      @media (max-width: 880px) {
        .faq-layout {
          grid-template-columns: 1fr;
          gap: 32px;
        }
      }
    `,
  ],
})
export class FaqSection {
  protected readonly faqs = inject(CargoDataService).faqs;
  protected readonly openIndex = signal<number | null>(0);

  protected toggle(index: number): void {
    this.openIndex.update((current) => (current === index ? null : index));
  }
}

