/**
 * Preferencia de tema de la interfaz (Fase A).
 *
 * El tema lo decide `data-bs-theme` en el `<html>`, no la preferencia del sistema
 * operativo: una persona con el sistema en oscuro entra en claro, como define el
 * requisito «Tema claro por defecto».
 *
 * La preferencia vive en una cookie legible por el servidor para que el atributo
 * venga en el primer HTML y no haya destello. No es una cookie de sesión: no
 * identifica a nadie, no autoriza nada y no se registra en auditoría.
 */
export const THEME_COOKIE = "runosorno_tema";

export type Theme = "light" | "dark";

export const THEME_DEFAULT: Theme = "light";

/** Un año: es una preferencia de presentación, no un dato sensible. */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const COOKIE_VALUE: Record<Theme, string> = {
  light: "claro",
  dark: "oscuro",
};

/** Traduce el valor de la cookie al tema aplicable, con claro como respaldo. */
export function themeFromCookie(value: string | undefined | null): Theme {
  return value === COOKIE_VALUE.dark ? "dark" : THEME_DEFAULT;
}

/** Valor que se escribe en la cookie para un tema. */
export function themeCookieValue(theme: Theme): string {
  return COOKIE_VALUE[theme];
}
