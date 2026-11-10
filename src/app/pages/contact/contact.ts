import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CargoDataService } from '../../services/cargo-data.service';

@Component({
  selector: 'app-contact-page',
  imports: [FormsModule],
  template: `
    <section class="page-header-band">
      <div class="container">
        <div class="kicker">
          <span class="kicker-plus">+</span>
          <span>Work With Us</span>
        </div>
        <h1>Request container capacity or lane pricing</h1>
        <p>
          Share your origin port, destination terminal, and monthly TEU volume. Our
          maritime desk responds within 2 business hours.
        </p>
      </div>
    </section>

    <section class="section-muted">
      <div class="container contact-grid">
        <div class="contact-card" data-aos="fade-right">
          @if (submitted()) {
            <div class="success-state">
              <span class="success-kicker">REQUEST LOGGED · REF #TRM-Q26</span>
              <h2>Freight inquiry received</h2>
              <p>
                Thank you, <strong>{{ company() || 'Partner' }}</strong>. Our Rotterdam &amp;
                Singapore dispatch desk is preparing your lane allocation for
                <strong>{{ lane() }}</strong>.
              </p>
              <button type="button" class="btn btn-dark" (click)="resetForm()">
                Submit Another Lane
              </button>
            </div>
          } @else {
            <form class="quote-form" (ngSubmit)="submitQuote()">
              <div class="form-row">
                <div class="field">
                  <label for="company-input">Company Name</label>
                  <input
                    id="company-input"
                    type="text"
                    name="company"
                    required
                    [ngModel]="company()"
                    (ngModelChange)="company.set($event)"
                    placeholder="Lumen Logistics Ltd."
                  />
                </div>
                <div class="field">
                  <label for="email-input">Work Email</label>
                  <input
                    id="email-input"
                    type="email"
                    name="email"
                    required
                    [ngModel]="email()"
                    (ngModelChange)="email.set($event)"
                    placeholder="ops@company.com"
                  />
                </div>
              </div>

              <div class="form-row">
                <div class="field">
                  <label for="mode-select">Freight Mode</label>
                  <select
                    id="mode-select"
                    name="mode"
                    [ngModel]="mode()"
                    (ngModelChange)="mode.set($event)"
                  >
                    <option value="Ocean FCL (40ft HC)">Ocean FCL (40ft High-Cube)</option>
                    <option value="Ocean LCL Consolidation">Ocean LCL Consolidation</option>
                    <option value="Active Reefer (-18°C)">Active Reefer (-18°C)</option>
                    <option value="Port-to-Door Intermodal">Port-to-Door Intermodal</option>
                  </select>
                </div>
                <div class="field">
                  <label for="lane-input">Primary Trade Lane</label>
                  <input
                    id="lane-input"
                    type="text"
                    name="lane"
                    required
                    [ngModel]="lane()"
                    (ngModelChange)="lane.set($event)"
                    placeholder="Shanghai (CNSHA) → Rotterdam (NLRTM)"
                  />
                </div>
              </div>

              <div class="field">
                <label for="notes-input">Cargo Details &amp; Monthly Volume</label>
                <textarea
                  id="notes-input"
                  name="notes"
                  rows="4"
                  [ngModel]="notes()"
                  (ngModelChange)="notes.set($event)"
                  placeholder="Estimated monthly TEUs, commodity class, or target sail date..."
                ></textarea>
              </div>

              <button type="submit" class="btn btn-dark submit-btn">
                Request Allocation Quote
              </button>
            </form>
          }
        </div>

        <aside class="contact-aside" data-aos="fade-left" data-aos-delay="120">
          <div class="aside-card">
            <h3>Global Dispatch Desks</h3>
            <p><strong>Europe:</strong> Rotterdam Maasvlakte II · +31 10 808 4210</p>
            <p><strong>Asia-Pacific:</strong> Singapore Tuas Hub · +65 6812 9400</p>
            <p><strong>North America:</strong> Savannah Terminal · +1 912 555 0194</p>
          </div>
          <div class="aside-card">
            <h3>Direct EDI / API Onboarding</h3>
            <p>
              Connect SAP, NetSuite, or Manhattan WMS to Terminus container webhooks for
              automated milestone syncing.
            </p>
          </div>
        </aside>
      </div>
    </section>
  `,
  styles: [
    `
      .contact-grid {
        display: grid;
        grid-template-columns: 1.5fr 1fr;
        gap: 28px;
        align-items: start;
      }

      .contact-card,
      .aside-card {
        background: #ffffff;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        padding: 32px;
      }

      .quote-form {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .field label {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .field input,
      .field select,
      .field textarea {
        padding: 11px 14px;
        border: 1px solid rgba(17, 19, 23, 0.16);
        border-radius: var(--radius-sm);
        background: #fcfcfd;
        font-size: 14px;
      }

      .submit-btn {
        align-self: flex-start;
        padding: 13px 26px;
      }

      .contact-aside {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .aside-card h3 {
        margin: 0 0 12px;
        font-size: 17px;
      }

      .aside-card p {
        margin: 0 0 8px;
        font-size: 13.5px;
        color: var(--text-secondary);
        line-height: 1.55;
      }

      .aside-card p:last-child {
        margin-bottom: 0;
      }

      .success-kicker {
        font-family: var(--font-brand);
        font-size: 12px;
        font-weight: 700;
        color: var(--accent-coral);
      }

      .success-state h2 {
        margin: 8px 0 10px;
      }

      .success-state p {
        margin: 0 0 22px;
        color: var(--text-secondary);
      }

      @media (max-width: 860px) {
        .contact-grid,
        .form-row {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ContactPage {
  private readonly cargoData = inject(CargoDataService);

  protected readonly company = signal('');
  protected readonly email = signal('');
  protected readonly mode = signal('Ocean FCL (40ft HC)');
  protected readonly lane = signal('Shanghai (CNSHA) → Rotterdam (NLRTM)');
  protected readonly notes = signal('');
  protected readonly submitted = signal(false);

  constructor() {
    const draft = this.cargoData.quoteDraft();
    if (draft) {
      this.mode.set(draft.mode);
      this.lane.set(draft.lane);
      this.notes.set(draft.notes);
    }
  }

  protected submitQuote(): void {
    this.submitted.set(true);
  }

  protected resetForm(): void {
    this.company.set('');
    this.email.set('');
    this.notes.set('');
    this.submitted.set(false);
  }
}

