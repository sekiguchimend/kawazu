import { useState, useEffect } from 'react';

interface Messages {
  [key: string]: any;
}

const translations: { [key: string]: Messages } = {
  en: {
    nav: {
      features: "FEATURES",
      docs: "DOCS", 
      support: "SUPPORT",
      profile: "PROFILE",
      developer: "DEVELOPER"
    },
    hero: {
      title: "CHAT",
      subtitle: "IN",
      description: "CODE",
      tagline: "REAL-TIME COLLABORATION",
      features: {
        instant: {
          title: "INSTANT",
          description: "Messages appear as you type"
        },
        secure: {
          title: "SECURE", 
          description: "Private rooms with encryption"
        },
        universal: {
          title: "UNIVERSAL",
          description: "Works with any code editor"
        },
        minimal: {
          title: "MINIMAL",
          description: "No bloated interfaces"
        }
      }
    },
    terminal: {
      title: "TERMINAL",
      install: "# INSTALL CLI",
      create: "# CREATE ROOM",
      join: "# JOIN ROOM", 
      start: "# START CHATTING",
      connected: "✓ Connected to room",
      fileCreated: "✓ File created: .codechat"
    },
    rooms: {
      create: {
        title: "CREATE",
        subtitle: "Start new collaboration"
      },
      join: {
        title: "JOIN",
        subtitle: "Active conversations"
      }
    },
    stats: {
      openSource: "Open Source",
      latency: "Latency", 
      rooms: "Rooms",
      available: "Available"
    },
    footer: {
      description: "Minimalist real-time collaboration for developers. Chat directly in your code editor.",
      product: "Product",
      features: "Features",
      pricing: "Pricing",
      documentation: "Documentation",
      api: "API",
      support: "Support",
      helpCenter: "Help Center",
      community: "Community",
      status: "Status",
      contact: "Contact",
      copyright: "© 2024 Kawazu. Crafted with precision."
    }
  },
  ja: {
    nav: {
      features: "機能",
      docs: "ドキュメント", 
      support: "サポート",
      profile: "プロフィール",
      developer: "開発者"
    },
    hero: {
      title: "チャット",
      subtitle: "イン",
      description: "コード",
      tagline: "リアルタイム コラボレーション",
      features: {
        instant: {
          title: "瞬時",
          description: "タイピング中にメッセージが表示"
        },
        secure: {
          title: "セキュア", 
          description: "暗号化されたプライベートルーム"
        },
        universal: {
          title: "ユニバーサル",
          description: "どのコードエディタでも動作"
        },
        minimal: {
          title: "ミニマル",
          description: "無駄のないインターフェース"
        }
      }
    },
    terminal: {
      title: "ターミナル",
      install: "# CLI をインストール",
      create: "# ルーム作成",
      join: "# ルーム参加", 
      start: "# チャット開始",
      connected: "✓ ルームに接続しました",
      fileCreated: "✓ ファイルを作成: .codechat"
    },
    rooms: {
      create: {
        title: "作成",
        subtitle: "新しいコラボレーションを開始"
      },
      join: {
        title: "参加",
        subtitle: "アクティブな会話"
      }
    },
    stats: {
      openSource: "オープンソース",
      latency: "レイテンシ", 
      rooms: "ルーム数",
      available: "利用可能"
    },
    footer: {
      description: "開発者のためのミニマルなリアルタイムコラボレーション。コードエディタで直接チャット。",
      product: "プロダクト",
      features: "機能",
      pricing: "料金",
      documentation: "ドキュメント",
      api: "API",
      support: "サポート",
      helpCenter: "ヘルプセンター",
      community: "コミュニティ",
      status: "ステータス",
      contact: "お問い合わせ",
      copyright: "© 2024 Kawazu. 精密に作られました。"
    }
  }
};

export function useTranslation() {
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    const savedLocale = localStorage.getItem('preferredLocale') || 'en';
    setLocale(savedLocale);

    const handleLanguageChange = () => {
      const newLocale = localStorage.getItem('preferredLocale') || 'en';
      setLocale(newLocale);
    };

    window.addEventListener('languageChanged', handleLanguageChange);
    return () => window.removeEventListener('languageChanged', handleLanguageChange);
  }, []);

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[locale];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  };

  return { t, locale };
} 