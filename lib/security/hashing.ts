/**
 * Parámetros de hashing de contraseñas (Fase 45, tarea 45.2).
 *
 * Estaban repartidos: el perfil usaba 12 rondas y el alta de coach y de atleta
 * usaban 10. Una constante compartida evita que vuelvan a divergir sin que
 * nadie se dé cuenta.
 */

/**
 * Número de rondas de bcrypt.
 *
 * Se bajó de 12 a 10 en la puesta en producción: en `workerd` (Cloudflare
 * Workers) cada login ejecuta bcrypt en CPU pura y 12 rondas costaban
 * ~450-770 ms, lo que hacía que los logins se cortaran intermitentemente con
 * `Worker exceeded CPU time limit` en arranques en frío. 10 rondas (~4x menos
 * CPU) siguen siendo razonables para este MVP con sal aleatoria; si más
 * adelante hay presupuesto de CPU (plan de pago), conviene volver a 12.
 */
export const BCRYPT_ROUNDS = 10;

/**
 * Coste de comparar una contraseña que no existe.
 *
 * `authenticate` la usa para no responder más rápido cuando el email no está
 * registrado que cuando sí, que es lo que delata qué emails existen. Usa las
 * mismas rondas que las reales: si costara menos, ese hash falso seguiría
 * delatando los emails que no existen.
 */
export const DUMMY_HASH_ROUNDS = BCRYPT_ROUNDS;