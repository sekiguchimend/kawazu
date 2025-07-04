'use client';

import Link from 'next/link';

export default function DeveloperPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* Main Content */}
      <main className="pt-8">
        {/* Hero Section */}
        <section className="px-8 py-20">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              
              {/* Left Column - Profile */}
              <div className="lg:col-span-4 space-y-8">
                <div className="space-y-6">
                  {/* Profile Image Placeholder */}
                  <div className="w-48 h-48 bg-black dark:bg-white mx-auto lg:mx-0"></div>
                  
                  <div className="text-center lg:text-left">
                    <h1 className="text-3xl font-black mb-2">関口峻矢</h1>
                    <p className="text-lg font-light mb-1">Full Stack Developer</p>
                    <p className="text-sm font-light opacity-60">19歳 • 日本・東京</p>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-4 border-t border-black/10 dark:border-white/10 pt-8">
                  <h3 className="text-lg font-bold uppercase tracking-wide">CONTACT</h3>
                  <div className="space-y-2 text-sm font-light">
                    <div className="flex items-center space-x-2">
                      <span className="w-4 h-4 border border-black dark:border-white flex items-center justify-center">@</span>
                      <span>shunya.sekiguchi@example.com</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-4 h-4 border border-black dark:border-white flex items-center justify-center">G</span>
                      <span>github.com/sekiguchi-shunya</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-4 h-4 border border-black dark:border-white flex items-center justify-center">T</span>
                      <span>twitter.com/sekiguchi_dev</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Details */}
              <div className="lg:col-span-8 space-y-12">
                
                {/* About */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-px h-16 bg-black dark:bg-white"></div>
                    <div>
                      <h2 className="text-3xl font-bold">DEVELOPER</h2>
                      <p className="text-lg font-light">Meet the creator</p>
                    </div>
                  </div>
                  
                  <p className="text-lg font-light leading-relaxed max-w-3xl">
                    19歳のフルスタック開発者。東京を拠点に活動し、より良いコラボレーションのためのミニマリストなツールを作成しています。クリーンなコード、エレガントなデザイン、シームレスなユーザーエクスペリエンスに焦点を当てています。
                  </p>
                </div>

                {/* Skills */}
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold">SKILLS</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      'TypeScript', 'React', 'Next.js',
                      'Node.js', 'Python', 'PostgreSQL',
                      'Docker', 'AWS', 'Git'
                    ].map((skill, index) => (
                      <div 
                        key={skill}
                        className="border border-black dark:border-white p-4 text-center hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
                      >
                        <span className="font-medium">{skill}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Projects */}
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold">PROJECTS</h3>
                  <div className="space-y-6">
                    <div className="border border-black dark:border-white p-6">
                      <h4 className="text-xl font-bold mb-2">Kawazu</h4>
                      <p className="font-light mb-4">開発者向けのリアルタイムコラボレーションプラットフォーム。コードエディタで直接チャットができ、シームレスな統合を提供します。</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 text-xs border border-black dark:border-white">TypeScript</span>
                        <span className="px-2 py-1 text-xs border border-black dark:border-white">Next.js</span>
                        <span className="px-2 py-1 text-xs border border-black dark:border-white">WebSocket</span>
                        <span className="px-2 py-1 text-xs border border-black dark:border-white">Supabase</span>
                      </div>
                    </div>

                    <div className="border border-black dark:border-white p-6">
                      <h4 className="text-xl font-bold mb-2">その他のプロジェクト</h4>
                      <p className="font-light mb-4">開発者の生産性とユーザーエクスペリエンス向上に焦点を当てた、様々なオープンソース貢献と個人プロジェクト。</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 text-xs border border-black dark:border-white">React</span>
                        <span className="px-2 py-1 text-xs border border-black dark:border-white">Python</span>
                        <span className="px-2 py-1 text-xs border border-black dark:border-white">Docker</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Experience Timeline */}
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold">EXPERIENCE</h3>
                  <div className="space-y-8">
                    <div className="flex items-start space-x-6">
                      <div className="w-8 h-8 border-2 border-black dark:border-white flex items-center justify-center mt-1">
                        <span className="text-xs font-bold">24</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">独立開発者</h4>
                        <p className="font-light opacity-60 mb-2">2024年 - 現在</p>
                        <p className="font-light">開発者のコラボレーションと生産性向上のための革新的なツールを構築。</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-6">
                      <div className="w-8 h-8 border-2 border-black dark:border-white flex items-center justify-center mt-1">
                        <span className="text-xs font-bold">23</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">フルスタック開発者</h4>
                        <p className="font-light opacity-60 mb-2">2023年 - 2024年</p>
                        <p className="font-light">モダンテクノロジーとベストプラクティスを使用したスケーラブルなWebアプリケーションの開発。</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-8 py-16 border-t border-black/10 dark:border-white/10">
          <div className="max-w-6xl mx-auto text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-6 h-6 bg-black dark:bg-white"></div>
              <span className="text-xl font-bold">KAWAZU</span>
            </div>
            <p className="text-sm font-light opacity-60">
              © 2024 Kawazu. Crafted with precision by 関口峻矢.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
} 