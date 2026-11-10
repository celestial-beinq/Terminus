import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CargoDataService, ShipmentRecord } from '../../services/cargo-data.service';

@Component({
  selector: 'app-shipment-tracker-bar',
  imports: [FormsModule],
  templateUrl: './shipment-tracker-bar.html',
  styleUrl: './shipment-tracker-bar.css',
})
export class ShipmentTrackerBar {
  private readonly cargoData = inject(CargoDataService);

  readonly initialTrackingId = input<string>('');

  protected readonly sampleIds = computed(() =>
    this.cargoData.liveShipments().slice(0, 3).map((s) => s.trackingId),
  );
  protected readonly query = signal('');
  protected readonly activeShipment = signal<ShipmentRecord | undefined>(undefined);
  protected readonly notFound = signal(false);

  constructor() {
    effect(() => {
      const nextId = this.initialTrackingId();
      if (nextId) {
        this.query.set(nextId);
        void this.lookup();
      }
    });
  }

  protected async lookup(): Promise<void> {
    if (!this.query().trim()) {
      this.activeShipment.set(undefined);
      this.notFound.set(false);
      return;
    }
    const match = await this.cargoData.lookupShipmentRemote(this.query());
    this.activeShipment.set(match);
    this.notFound.set(!match);
  }

  protected selectSample(trackingId: string): void {
    this.query.set(trackingId);
    void this.lookup();
  }
}

