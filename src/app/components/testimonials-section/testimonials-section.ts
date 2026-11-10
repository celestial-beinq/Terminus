import { Component, inject } from '@angular/core';
import { CargoDataService } from '../../services/cargo-data.service';

@Component({
  selector: 'app-testimonials-section',
  template: `
    <section class="section-muted" aria-label="Client Testimonials">
      <div class="container">
        <div class="testimonials-head">
          <div class="kicker">
            <span class="kicker-plus">+</span>
            <span>Client Testimonials</span>
          </div>
          <h2>Trusted by supply chain &amp; logistics directors worldwide</h2>
        </div>

        <div class="testimonials-grid">
          @for (item of testimonials; track item.author) {
            <blockquote class="testimonial-card">
              <span class="testimonial-lane">{{ item.lane }}</span>
              <p class="testimonial-quote">“{{ item.quote }}”</p>
              <footer class="testimonial-footer">
                <strong>{{ item.author }}</strong>
                <span>{{ item.role }} · {{ item.company }}</span>
              </footer>
            </blockquote>
          }
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .testimonials-head {
        max-width: 620px;
        margin-bottom: 36px;
      }

      .testimonials-head h2 {
        margin: 10px 0 0;
        font-size: clamp(26px, 3vw, 36px);
        letter-spacing: -0.025em;
      }

      .testimonials-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 24px;
      }

      .testimonial-card {
        margin: 0;
        padding: 28px;
        background: #ffffff;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        display: flex;
        flex-direction: column;
      }

      .testimonial-lane {
        font-family: var(--font-brand);
        font-size: 11.5px;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: var(--accent-coral);
        margin-bottom: 14px;
      }

      .testimonial-quote {
        margin: 0 0 24px;
        font-size: 15px;
        line-height: 1.6;
        color: var(--text-primary);
      }

      .testimonial-footer {
        margin-top: auto;
        padding-top: 16px;
        border-top: 1px solid var(--border-subtle);
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .testimonial-footer strong {
        font-size: 14.5px;
      }

      .testimonial-footer span {
        font-size: 12.5px;
        color: var(--text-secondary);
      }

      @media (max-width: 900px) {
        .testimonials-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class TestimonialsSection {
  protected readonly testimonials = inject(CargoDataService).testimonials;
}

