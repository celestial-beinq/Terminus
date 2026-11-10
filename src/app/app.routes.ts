import { Routes } from '@angular/router';
import { HomePage } from './pages/home/home';

export const routes: Routes = [
  {
    path: '',
    component: HomePage,
    title: 'Terminus — Global Cargo Shipping & Logistics Infrastructure',
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about/about').then((m) => m.AboutPage),
    title: 'About — Terminus',
  },
  {
    path: 'services',
    loadComponent: () => import('./pages/services/services').then((m) => m.ServicesPage),
    title: 'Cargo Services — Terminus',
  },
  {
    path: 'tracking',
    loadComponent: () => import('./pages/tracking/tracking').then((m) => m.TrackingPage),
    title: 'Live Shipment Tracking — Terminus',
  },
  {
    path: 'case-studies',
    loadComponent: () =>
      import('./pages/case-studies/case-studies').then((m) => m.CaseStudiesPage),
    title: 'Case Studies — Terminus',
  },
  {
    path: 'contact',
    loadComponent: () => import('./pages/contact/contact').then((m) => m.ContactPage),
    title: 'Work With Us — Terminus',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
