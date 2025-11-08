import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type ChatTheme = 'light' | 'dark' | 'system';

interface ChatThemeContextType {
  theme: ChatTheme;
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: ChatTheme) => void;
}

const ChatThemeContext = createContext<ChatThemeContextType | undefined>(undefined);

export function ChatThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ChatTheme>(() => {
    const stored = localStorage.getItem('chat-theme');
    return (stored as ChatTheme) || 'system';
  });

  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const updateEffectiveTheme = () => {
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        setEffectiveTheme(systemTheme);
      } else {
        setEffectiveTheme(theme);
      }
    };

    updateEffectiveTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateEffectiveTheme);

    return () => mediaQuery.removeEventListener('change', updateEffectiveTheme);
  }, [theme]);

  const setTheme = (newTheme: ChatTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('chat-theme', newTheme);
  };

  return (
    <ChatThemeContext.Provider value={{ theme, effectiveTheme, setTheme }}>
      {children}
    </ChatThemeContext.Provider>
  );
}

export function useChatTheme() {
  const context = useContext(ChatThemeContext);
  if (context === undefined) {
    throw new Error('useChatTheme must be used within a ChatThemeProvider');
  }
  return context;
}
