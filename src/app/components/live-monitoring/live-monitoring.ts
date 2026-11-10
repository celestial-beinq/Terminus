import { Component, computed, inject, signal } from '@angular/core';
import { ShipmentTrackerBar } from '../shipment-tracker-bar/shipment-tracker-bar';
import { PortNetwork } from '../port-network/port-network';
import { SilentVideoDirective } from '../../directives/silent-video.directive';
import { CargoDataService } from '../../services/cargo-data.service';

@Component({
  selector: 'app-live-monitoring',
  imports: [ShipmentTrackerBar, PortNetwork, SilentVideoDirective],
  templateUrl: './live-monitoring.html',
  styleUrl: './live-monitoring.css',
})
export class LiveMonitoring {
  private readonly cargoData = inject(CargoDataService);

  protected readonly activeTab = signal<'tracker' | 'ports'>('tracker');
  protected readonly liveTerminalCount = computed(() => this.cargoData.livePorts().length);
  protected readonly weeklySailingsTotal = computed(() =>
    this.cargoData.livePorts().reduce((sum, p) => sum + p.weeklySailings, 0),
  );
  protected readonly syncLabel = this.cargoData.lastSyncLabel;
}

