/**
 * Worker de calentamiento (P1.5).
 *
 * No atiende tráfico de usuarios. Solo tiene un Cron Trigger de Cloudflare que,
 * cada 2 minutos, pide `/api/health` al Worker principal (`runosorno`) mediante
 * un service binding. Así se mantiene caliente el isolate que sirve el login sin
 * depender de un cron externo ni de una petición a Internet.
 *
 * No sube el techo de 10 ms de CPU de Workers Free: solo reduce los arranques
 * en frío. Ver `docs/calentamiento.md`.
 */
const worker = {
  async fetch() {
    return new Response("runosorno-calentamiento", { status: 200 });
  },

  async scheduled(controller, env) {
    try {
      const response = await env.APP.fetch("https://runosorno/api/health");
      if (!response.ok) {
        console.error(
          `Calentamiento (${controller.cron}): /api/health devolvió ${response.status}`,
        );
      }
    } catch (error) {
      console.error("Calentamiento falló:", error);
    }
  },
};

export default worker;
