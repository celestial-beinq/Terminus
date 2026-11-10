import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeroSection } from '../../components/hero-section/hero-section';
import { StatsStrip } from '../../components/stats-strip/stats-strip';
import { TrustBand } from '../../components/trust-band/trust-band';
import { AboutShowcase } from '../../components/about-showcase/about-showcase';
import { WhyChooseUs } from '../../components/why-choose-us/why-choose-us';
import { LiveMonitoring } from '../../components/live-monitoring/live-monitoring';
import { HowItWorks } from '../../components/how-it-works/how-it-works';
import { OurServices } from '../../components/our-services/our-services';
import { ServicesGrid } from '../../components/services-grid/services-grid';
import { FreightCalculator } from '../../components/freight-calculator/freight-calculator';
import { CountriesShowcase } from '../../components/countries-showcase/countries-showcase';
import { TestimonialsSection } from '../../components/testimonials-section/testimonials-section';
import { FaqSection } from '../../components/faq-section/faq-section';
import { CtaBand } from '../../components/cta-band/cta-band';

@Component({
  selector: 'app-home-page',
  imports: [
    HeroSection,
    StatsStrip,
    TrustBand,
    AboutShowcase,
    WhyChooseUs,
    LiveMonitoring,
    HowItWorks,
    OurServices,
    ServicesGrid,
    FreightCalculator,
    CountriesShowcase,
    TestimonialsSection,
    FaqSection,
    CtaBand,
    RouterLink,
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomePage {}
