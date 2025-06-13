'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CreateRoomForm } from '@/components/CreateRoomForm';
import { RoomList } from '@/components/RoomList';
import { useTranslation } from '@/hooks/useTranslation';
import { LanguageSwitcherDropdown } from '@/components/LanguageSwitcherDropdown';

export default function HomePage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { t } = useTranslation();

  const handleRoomCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* Header Navigation */}
      <header className="fixed top-0 w-full z-50 bg-white/90 dark:bg-black/90 backdrop-blur-sm border-b border-black/10 dark:border-white/10">
        <div className="flex items-center justify-between px-8 py-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-black dark:bg-white"></div>
            <span className="text-2xl font-bold tracking-tight">KAWAZU</span>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium">
            <Link href="#features" className="hover:opacity-60 transition-opacity">{t('nav.features')}</Link>
            <Link href="/pricing" className="hover:opacity-60 transition-opacity">Pricing</Link>
            <Link href="#docs" className="hover:opacity-60 transition-opacity">{t('nav.docs')}</Link>
            <Link href="#support" className="hover:opacity-60 transition-opacity">{t('nav.support')}</Link>
            <Link href="/developer" className="hover:opacity-60 transition-opacity">{t('nav.developer')}</Link>
          </nav>
          
          <div className="flex items-center space-x-4">
            <Link href="/auth" className="text-sm hover:opacity-60 transition-opacity">Login</Link>
            <LanguageSwitcherDropdown />
            <div className="w-6 h-6 border border-black dark:border-white flex items-center justify-center cursor-pointer hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all">
              <span className="text-xs">◐</span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="pt-24">
        {/* Large Typography Hero */}
        <section className="px-8 py-20">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column - Typography */}
              <div className="lg:col-span-7 space-y-8">
                <div className="space-y-6">
                  <h1 className="text-7xl md:text-9xl font-black leading-none tracking-tighter">
                    {t('hero.title')}
                    <br />
                    <span className="italic">{t('hero.subtitle')}</span>
                    <br />
                    {t('hero.description')}
                  </h1>
                  
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-px bg-black dark:bg-white"></div>
                    <p className="text-lg font-light tracking-wide">
                      {t('hero.tagline')}
                    </p>
                  </div>
                </div>

                {/* Feature Grid */}
                <div className="grid grid-cols-2 gap-8 pt-12">
                  <div className="space-y-2">
                    <div className="w-8 h-8 border-2 border-black dark:border-white flex items-center justify-center">
                      <span className="text-xs font-bold">01</span>
                    </div>
                    <h3 className="font-bold text-lg">{t('hero.features.instant.title')}</h3>
                    <p className="text-sm font-light">{t('hero.features.instant.description')}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="w-8 h-8 border-2 border-black dark:border-white flex items-center justify-center">
                      <span className="text-xs font-bold">02</span>
                    </div>
                    <h3 className="font-bold text-lg">{t('hero.features.secure.title')}</h3>
                    <p className="text-sm font-light">{t('hero.features.secure.description')}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="w-8 h-8 border-2 border-black dark:border-white flex items-center justify-center">
                      <span className="text-xs font-bold">03</span>
                    </div>
                    <h3 className="font-bold text-lg">{t('hero.features.universal.title')}</h3>
                    <p className="text-sm font-light">{t('hero.features.universal.description')}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="w-8 h-8 border-2 border-black dark:border-white flex items-center justify-center">
                      <span className="text-xs font-bold">04</span>
                    </div>
                    <h3 className="font-bold text-lg">{t('hero.features.minimal.title')}</h3>
                    <p className="text-sm font-light">{t('hero.features.minimal.description')}</p>
                  </div>
                </div>
              </div>

              {/* Right Column - Terminal */}
              <div className="lg:col-span-5">
                <div className="bg-black dark:bg-white text-white dark:text-black p-8 font-mono text-sm">
                  <div className="space-y-4">
                    <div className="border-b border-white/20 dark:border-black/20 pb-4">
                      <span className="opacity-60">{t('terminal.title')}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="opacity-60">{t('terminal.install')}</div>
                      <div>$ npm install -g kawazu</div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="opacity-60">{t('terminal.create')}</div>
                      <div>$ kawazu create my-project</div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="opacity-60">{t('terminal.join')}</div>
                      <div>$ kawazu join my-project</div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="opacity-60">{t('terminal.start')}</div>
                      <div>{t('terminal.connected')}</div>
                      <div>{t('terminal.fileCreated')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Room Management Section */}
        <section className="px-8 py-20 border-t border-black/10 dark:border-white/10">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              
              {/* Create Room */}
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-px h-16 bg-black dark:bg-white"></div>
                    <div>
                      <h2 className="text-3xl font-bold">{t('rooms.create.title')}</h2>
                      <p className="text-lg font-light">{t('rooms.create.subtitle')}</p>
                    </div>
                  </div>
                </div>
                
                <div className="border border-black dark:border-white p-8">
                  <CreateRoomForm onRoomCreated={handleRoomCreated} />
                </div>
              </div>

              {/* Join Room */}
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-px h-16 bg-black dark:bg-white"></div>
                    <div>
                      <h2 className="text-3xl font-bold">{t('rooms.join.title')}</h2>
                      <p className="text-lg font-light">{t('rooms.join.subtitle')}</p>
                    </div>
                  </div>
                </div>
                
                <div className="border border-black dark:border-white p-8">
                  <RoomList key={refreshKey} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="px-8 py-20 border-t border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
              <div className="space-y-2">
                <div className="text-4xl font-black">100%</div>
                <div className="text-sm font-light uppercase tracking-wider">{t('stats.openSource')}</div>
              </div>
              
              <div className="space-y-2">
                <div className="text-4xl font-black">0ms</div>
                <div className="text-sm font-light uppercase tracking-wider">{t('stats.latency')}</div>
              </div>
              
              <div className="space-y-2">
                <div className="text-4xl font-black">∞</div>
                <div className="text-sm font-light uppercase tracking-wider">{t('stats.rooms')}</div>
              </div>
              
              <div className="space-y-2">
                <div className="text-4xl font-black">24/7</div>
                <div className="text-sm font-light uppercase tracking-wider">{t('stats.available')}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-8 py-16 border-t border-black/10 dark:border-white/10">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-black dark:bg-white"></div>
                  <span className="text-xl font-bold">KAWAZU</span>
                </div>
                <p className="text-sm font-light max-w-xs">
                  {t('footer.description')}
                </p>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wide">{t('footer.product')}</h3>
                <ul className="space-y-2 text-sm font-light">
                  <li><Link href="#features" className="hover:opacity-60 transition-opacity">{t('footer.features')}</Link></li>
                  <li><Link href="/pricing" className="hover:opacity-60 transition-opacity">{t('footer.pricing')}</Link></li>
                  <li><Link href="#docs" className="hover:opacity-60 transition-opacity">{t('footer.documentation')}</Link></li>
                  <li><Link href="#api" className="hover:opacity-60 transition-opacity">{t('footer.api')}</Link></li>
                </ul>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wide">{t('footer.support')}</h3>
                <ul className="space-y-2 text-sm font-light">
                  <li><Link href="#help" className="hover:opacity-60 transition-opacity">{t('footer.helpCenter')}</Link></li>
                  <li><Link href="#community" className="hover:opacity-60 transition-opacity">{t('footer.community')}</Link></li>
                  <li><Link href="#status" className="hover:opacity-60 transition-opacity">{t('footer.status')}</Link></li>
                  <li><Link href="#contact" className="hover:opacity-60 transition-opacity">{t('footer.contact')}</Link></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-black/10 dark:border-white/10 mt-12 pt-8 text-center">
              <p className="text-sm font-light opacity-60">
                {t('footer.copyright')}
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}