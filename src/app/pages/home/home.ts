import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeroSection } from '../../components/hero-section/hero-section';
import { StatsStrip } from '../../components/stats-strip/stats-strip';
import { TrustBand } from '../../components/trust-band/trust-band';
import { AboutShowcase } from '../../components/about-showcase/about-showcase';
import { LiveMonitoring } from '../../components/live-monitoring/live-monitoring';
import { HowItWorks } from '../../components/how-it-works/how-it-works';
import { ServicesGrid } from '../../components/services-grid/services-grid';
import { FreightCalculator } from '../../components/freight-calculator/freight-calculator';
import { CountriesShowcase } from '../../components/countries-showcase/countries-showcase';
import { TestimonialsSection } from '../../components/testimonials-section/testimonials-section';
import { FaqSection } from '../../components/faq-section/faq-section';
import { SilentVideoDirective } from '../../directives/silent-video.directive';

@Component({
  selector: 'app-home-page',
  imports: [
    HeroSection,
    StatsStrip,
    TrustBand,
    AboutShowcase,
    LiveMonitoring,
    HowItWorks,
    ServicesGrid,
    FreightCalculator,
    CountriesShowcase,
    TestimonialsSection,
    FaqSection,
    SilentVideoDirective,
    RouterLink,
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomePage {}
