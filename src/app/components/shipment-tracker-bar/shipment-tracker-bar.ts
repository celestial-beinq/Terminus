import { Component, effect, inject, input, signal } from '@angular/core';
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

  readonly initialTrackingId = input<string>('TRM-884210');

  protected readonly sampleIds = this.cargoData.shipments.map((s) => s.trackingId);
  protected readonly query = signal('TRM-884210');
  protected readonly activeShipment = signal<ShipmentRecord | undefined>(
    this.cargoData.findShipment('TRM-884210'),
  );
  protected readonly notFound = signal(false);

  constructor() {
    effect(() => {
      const nextId = this.initialTrackingId();
      if (nextId) {
        this.query.set(nextId);
        this.lookup();
      }
    });
  }

  protected async lookup(): Promise<void> {
    const match = await this.cargoData.lookupShipmentRemote(this.query());
    this.activeShipment.set(match);
    this.notFound.set(!match);
  }

  protected selectSample(trackingId: string): void {
    this.query.set(trackingId);
    void this.lookup();
  }
}

