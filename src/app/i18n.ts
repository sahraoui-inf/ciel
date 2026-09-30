import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";

export const locales = ["en", "ar"];
export const defaultLocale = "en";
export const rtlLocales = ["ar"];

export function isRtlLocale(locale: string): boolean {
  return rtlLocales.includes(locale);
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(locales, requested) ? requested : defaultLocale;
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
