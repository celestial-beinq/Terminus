import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CargoDataService } from '../../services/cargo-data.service';

@Component({
  selector: 'app-freight-calculator',
  imports: [FormsModule, CurrencyPipe],
  templateUrl: './freight-calculator.html',
  styleUrl: './freight-calculator.css',
})
export class FreightCalculator {
  private readonly cargoData = inject(CargoDataService);
  private readonly router = inject(Router);

  protected readonly ports = this.cargoData.livePorts;
  protected readonly containerSpecs = this.cargoData.containerSpecs;

  protected readonly originCode = signal('CNSHA');
  protected readonly destinationCode = signal('NLRTM');
  protected readonly containerId = signal('40-hc');
  protected readonly quantity = signal(2);

  protected readonly quote = computed(() =>
    this.cargoData.calculateFreightQuote(
      this.originCode(),
      this.destinationCode(),
      this.containerId(),
      this.quantity(),
    ),
  );

  protected swapPorts(): void {
    const currentOrigin = this.originCode();
    this.originCode.set(this.destinationCode());
    this.destinationCode.set(currentOrigin);
  }

  protected adjustQuantity(delta: number): void {
    this.quantity.update((val) => Math.max(1, Math.min(50, val + delta)));
  }

  protected bookLane(): void {
    const current = this.quote();
    if (!current) {
      return;
    }

    this.cargoData.setQuoteDraft({
      mode: current.container.id === '40-reefer' ? 'Active Reefer (-18°C)' : 'Ocean FCL (40ft HC)',
      lane: `${current.origin.name} (${current.origin.code}) → ${current.destination.name} (${current.destination.code})`,
      notes: `Estimated ${current.quantity} × ${current.container.label} (${current.transitDays} days, est. $${current.totalUsd.toLocaleString('en-US')})`,
    });

    this.router.navigate(['/contact']);
  }
}

