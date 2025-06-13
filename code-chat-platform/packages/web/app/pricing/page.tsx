'use client';

import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { LanguageSwitcherDropdown } from '@/components/LanguageSwitcherDropdown';

export default function PricingPage() {
  const { t } = useTranslation();
  const [billingCycle, setBillingCycle] = useState('monthly');

  const plans = [
    {
      name: 'Free',
      price: { monthly: '$0', yearly: '$0' },
      description: 'For individuals and small teams getting started.',
      features: [
        'Up to 3 rooms',
        'Unlimited messages',
        'Real-time collaboration',
        'Community support',
      ],
      cta: 'Start for Free',
      isPrimary: false,
    },
    {
      name: 'Pro',
      price: { monthly: '$10', yearly: '$96' },
      description: 'For growing teams that need more power and features.',
      features: [
        'Unlimited rooms',
        'Unlimited messages',
        'Advanced collaboration tools',
        'Priority support',
        'Team management',
      ],
      cta: 'Get Started',
      isPrimary: true,
    },
    {
      name: 'Enterprise',
      price: { monthly: 'Custom', yearly: 'Custom' },
      description: 'For large organizations with specific security and support needs.',
      features: [
        'All Pro features',
        'Single Sign-On (SSO)',
        'Dedicated support & SLA',
        'On-premise deployment option',
        'Custom integrations',
      ],
      cta: 'Contact Sales',
      isPrimary: false,
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/90 dark:bg-black/90 backdrop-blur-sm border-b border-black/10 dark:border-white/10">
        <div className="flex items-center justify-between px-8 py-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-black dark:bg-white"></div>
            <a href="/" className="text-2xl font-bold tracking-tight">KAWAZU</a>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium">
            <a href="/#features" className="hover:opacity-60 transition-opacity">{t('nav.features')}</a>
            <a href="/#docs" className="hover:opacity-60 transition-opacity">{t('nav.docs')}</a>
            <a href="/developer" className="hover:opacity-60 transition-opacity">{t('nav.developer')}</a>
          </nav>
          
          <div className="flex items-center space-x-4">
            <a href="/create-profile" className="text-sm hover:opacity-60 transition-opacity">{t('nav.profile')}</a>
            <LanguageSwitcherDropdown />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24">
        {/* Pricing Hero */}
        <section className="px-8 py-20 text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-6xl md:text-8xl font-black leading-none tracking-tighter">
              Pricing
            </h1>
            <p className="mt-4 text-lg font-light max-w-xl mx-auto">
              Choose the plan that fits your needs. Simple, transparent pricing for teams of all sizes.
            </p>
            
            {/* Billing Cycle Toggle */}
            <div className="mt-12 inline-flex border border-black dark:border-white p-1">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 text-sm font-medium transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'bg-white text-black dark:bg-black dark:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`relative px-6 py-2 text-sm font-medium transition-all ${
                  billingCycle === 'yearly'
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'bg-white text-black dark:bg-black dark:text-white'
                }`}
              >
                Yearly
                <span className="absolute -top-2 -right-2 bg-black text-white dark:bg-white dark:text-black text-xs font-bold px-2 py-0.5 transform rotate-12">
                  SAVE 20%
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Pricing Grid */}
        <section className="px-8 py-20 border-t border-black/10 dark:border-white/10">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`border ${plan.isPrimary ? 'border-black dark:border-white' : 'border-black/50 dark:border-white/50'} p-8 flex flex-col`}
                >
                  <div className="flex-grow">
                    <h2 className="text-3xl font-bold mb-4">{plan.name}</h2>
                    <p className="text-lg font-light mb-8 h-12">{plan.description}</p>
                    <div className="mb-8">
                      <span className="text-5xl font-black">
                        {billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly}
                      </span>
                      {plan.name !== 'Enterprise' && (
                        <span className="text-lg font-light">
                          {billingCycle === 'monthly' ? ' / month' : ' / year'}
                        </span>
                      )}
                    </div>
                    <ul className="space-y-4">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center space-x-3 font-light">
                          <span className="w-4 h-4 border border-current flex-shrink-0 flex items-center justify-center">
                            <span className="w-1.5 h-px bg-current transform rotate-45"></span>
                            <span className="w-2.5 h-px bg-current transform -rotate-45 -translate-x-px"></span>
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-12">
                    <a href="#" className={`block w-full text-center px-6 py-3 text-base font-medium border ${
                      plan.isPrimary
                        ? 'bg-black text-white border-black hover:bg-white hover:text-black dark:bg-white dark:text-black dark:border-white dark:hover:bg-black dark:hover:text-white'
                        : 'bg-white text-black border-black hover:bg-black hover:text-white dark:bg-black dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-black'
                      } transition-all`}>
                      {plan.cta}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-8 py-16 border-t border-black/10 dark:border-white/10">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-sm font-light opacity-60">
              {t('footer.copyright')}
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
} 