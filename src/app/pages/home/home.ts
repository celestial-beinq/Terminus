import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeroSection } from '../../components/hero-section/hero-section';
import { StatsStrip } from '../../components/stats-strip/stats-strip';
import { ShipmentTrackerBar } from '../../components/shipment-tracker-bar/shipment-tracker-bar';
import { ServicesGrid } from '../../components/services-grid/services-grid';

@Component({
  selector: 'app-home-page',
  imports: [HeroSection, StatsStrip, ShipmentTrackerBar, ServicesGrid, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomePage {}

