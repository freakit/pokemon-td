// src/i18n/useTranslation.ts
import { useContext } from 'react';
import { TranslationContext } from './I18nProvider';

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider');
  }
  return context;
};
