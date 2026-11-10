import { Component, signal } from '@angular/core';
import { ShipmentTrackerBar } from '../shipment-tracker-bar/shipment-tracker-bar';
import { PortNetwork } from '../port-network/port-network';
import { SilentVideoDirective } from '../../directives/silent-video.directive';

@Component({
  selector: 'app-live-monitoring',
  imports: [ShipmentTrackerBar, PortNetwork, SilentVideoDirective],
  templateUrl: './live-monitoring.html',
  styleUrl: './live-monitoring.css',
})
export class LiveMonitoring {
  protected readonly activeTab = signal<'tracker' | 'ports'>('tracker');
}

