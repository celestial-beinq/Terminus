import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandLogo } from '../brand-logo/brand-logo';

@Component({
  selector: 'app-hero-section',
  imports: [RouterLink, BrandLogo],
  templateUrl: './hero-section.html',
  styleUrl: './hero-section.css',
})
export class HeroSection {}

