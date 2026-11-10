import { Routes } from '@angular/router';
import { HomePage } from './pages/home/home';
import { authGuard } from './guards/auth.guard';

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
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginPage),
    title: 'Sign In — Terminus Portal',
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardPage),
    title: 'Operations Dashboard — Terminus',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
