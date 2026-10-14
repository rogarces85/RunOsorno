/**
 * Parámetros de hashing de contraseñas (Fase 45, tarea 45.2).
 *
 * Estaban repartidos: el perfil usaba 12 rondas y el alta de coach y de atleta
 * usaban 10. Una constante compartida evita que vuelvan a divergir sin que
 * nadie se dé cuenta.
 */

/**
 * Número de rondas de bcrypt. 12 es el mínimo que recomienda OWASP hoy; bajar
 * de ahí vuelve los hashes más baratos de romper por fuerza bruta.
 */
export const BCRYPT_ROUNDS = 12;

/**
 * Coste de comparar una contraseña que no existe.
 *
 * `authenticate` la usa para no responder más rápido cuando el email no está
 * registrado que cuando sí, que es lo que delata qué emails existen. Usa las
 * mismas rondas que las reales: si costara menos, ese hash falso seguiría
 * delatando los emails que no existen.
 */
export const DUMMY_HASH_ROUNDS = BCRYPT_ROUNDS;