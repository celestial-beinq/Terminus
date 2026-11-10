import { Component, computed, inject, signal } from '@angular/core';
import { CargoDataService } from '../../services/cargo-data.service';

@Component({
  selector: 'app-how-it-works',
  template: `
    <section class="section-light" aria-label="How Terminus Container Shipping Works">
      <div class="container">
        <div class="how-header" data-aos="fade-down">
          <div class="kicker">
            <span class="kicker-plus">+</span>
            <span>How Terminus Works</span>
          </div>
          <h2>From booking confirmation to final port discharge in four synchronized steps</h2>
        </div>

        <div class="how-grid">
          <div class="how-steps" role="tablist" aria-label="Shipping Workflow Steps">
            @for (step of steps; track step.number; let idx = $index) {
              <button
                type="button"
                role="tab"
                class="step-card"
                data-aos="fade-right"
                [attr.data-aos-delay]="idx * 90"
                [class.is-active]="activeIndex() === idx"
                [attr.aria-selected]="activeIndex() === idx"
                (click)="activeIndex.set(idx)"
              >
                <div class="step-top">
                  <span class="step-num">{{ step.number }}</span>
                  <span class="step-tag">{{ step.tag }}</span>
                </div>
                <h3>{{ step.title }}</h3>
                <p>{{ step.description }}</p>
              </button>
            }
          </div>

          <div class="how-visual" data-aos="zoom-in-up" data-aos-delay="150">
            @if (activeStep(); as current) {
              <img
                [src]="current.imageUrl"
                [alt]="current.imageAlt"
                class="how-img"
              />
              <div class="how-caption">
                <span class="caption-step">STAGE {{ current.number }} · {{ current.tag }}</span>
                <strong>{{ current.title }}</strong>
              </div>
            }
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .how-header {
        max-width: 660px;
        margin-bottom: 36px;
      }

      .how-header h2 {
        margin: 10px 0 0;
        font-size: clamp(26px, 3vw, 38px);
        line-height: 1.12;
        letter-spacing: -0.025em;
      }

      .how-grid {
        display: grid;
        grid-template-columns: 1.05fr 0.95fr;
        gap: 32px;
        align-items: stretch;
      }

      .how-steps {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .step-card {
        text-align: left;
        padding: 20px 22px;
        border-radius: var(--radius-md);
        background: #f8f9fb;
        border: 1px solid var(--border-subtle);
        cursor: pointer;
        transition: all var(--transition-fast);
      }

      .step-card:hover {
        border-color: rgba(17, 19, 23, 0.22);
      }

      .step-card.is-active {
        background: #111317;
        color: #ffffff;
        border-color: #111317;
      }

      .step-top {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }

      .step-num {
        font-family: var(--font-brand);
        font-size: 13px;
        font-weight: 700;
        color: var(--accent-coral);
      }

      .step-tag {
        font-family: var(--font-brand);
        font-size: 11.5px;
        font-weight: 700;
        letter-spacing: 0.1em;
        opacity: 0.72;
      }

      .step-card h3 {
        margin: 0 0 6px;
        font-size: 17.5px;
        font-weight: 600;
      }

      .step-card p {
        margin: 0;
        font-size: 13.5px;
        line-height: 1.55;
        color: var(--text-secondary);
      }

      .step-card.is-active p {
        color: rgba(255, 255, 255, 0.78);
      }

      .how-visual {
        position: relative;
        border-radius: var(--radius-lg);
        overflow: hidden;
        border: 1px solid var(--border-subtle);
        min-height: 440px;
      }

      .how-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .how-caption {
        position: absolute;
        left: 18px;
        right: 18px;
        bottom: 18px;
        padding: 16px 20px;
        border-radius: var(--radius-md);
        background: rgba(10, 11, 13, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.16);
        backdrop-filter: blur(12px);
        color: #ffffff;
      }

      .caption-step {
        display: block;
        font-family: var(--font-brand);
        font-size: 11px;
        letter-spacing: 0.12em;
        color: var(--accent-coral);
        margin-bottom: 4px;
      }

      @media (max-width: 900px) {
        .how-grid {
          grid-template-columns: 1fr;
        }

        .how-visual {
          min-height: 320px;
          max-height: 380px;
        }
      }
    `,
  ],
})
export class HowItWorks {
  protected readonly steps = inject(CargoDataService).workflowSteps;
  protected readonly activeIndex = signal(0);
  protected readonly activeStep = computed(() => this.steps[this.activeIndex()]);
}

