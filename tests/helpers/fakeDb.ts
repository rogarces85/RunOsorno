import * as schema from "@/lib/db/schema";

/**
 * Doble de `db` para pruebas unitarias.
 *
 * No evalúa las condiciones SQL: devuelve, para cada tabla consultada, las
 * filas que la prueba haya preparado en `store`, recortadas por `limit()`. Es
 * suficiente para el código que decide a partir del *contenido* de la fila
 * (propiedad del usuario, fecha de la sesión, ventana de edición) y evita que
 * la suite dependa de MySQL.
 *
 * Si lo preparado para una tabla es una **lista de listas**, se interpreta como
 * una cola: cada `from()` toma la siguiente. Hace falta cuando el mismo código
 * consulta dos veces una tabla con criterios distintos y el resultado importa
 * para ambos (por ejemplo, `canViewAthlete`: primero `team_members` para
 * "¿es mi atleta?" y después, con joins, para "¿es de un coach de mi grupo?").
 *
 * Uso típico:
 *
 * ```ts
 * store.sessionAssignments = [{ id: "a1", athleteId: "otro" }];
 * const result = await canEditRecord("a1", "yo");
 * ```
 */

export type TableStore = Record<string, unknown[]>;

/** Llamadas de escritura registradas por el doble, para poder afirmar sobre ellas. */
export type WriteLog = {
  inserted: Record<string, unknown[]>;
  updated: Record<string, unknown[]>;
  deleted: string[];
};

type Chain = {
  from: (table: unknown) => Chain;
  where: (condition: unknown) => Chain;
  innerJoin: (table: unknown, condition: unknown) => Chain;
  leftJoin: (table: unknown, condition: unknown) => Chain;
  orderBy: (order: unknown) => Chain;
  groupBy: (...columns: unknown[]) => Chain;
  limit: (count: number) => Promise<unknown[]>;
  then: (
    onFulfilled: (value: unknown[]) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise<unknown>;
};

// Nombre de la tabla según el export del schema: los objetos de Drizzle son
// singletons, así que la referencia identifica la tabla sin más.
const tableNames = new Map<unknown, string>(
  Object.entries(schema).map(([name, value]) => [value, name]),
);

export function createFakeDb(store: TableStore, writes: WriteLog) {
  // Índice de la cola por tabla: solo se avanza si el valor es una lista de listas.
  const cursors = new Map<string, number>();

  const build = (): Chain => {
    let table = "";
    const rows = (): unknown[] => {
      const staged = store[table];
      if (staged === undefined) {
        return [];
      }
      if (!Array.isArray(staged[0])) {
        return staged;
      }
      const index = cursors.get(table) ?? 0;
      cursors.set(table, index + 1);
      return (staged[index] as unknown[]) ?? [];
    };

    const chain: Chain = {
      from(next) {
        table = tableNames.get(next) ?? String(next);
        return chain;
      },
      where() {
        return chain;
      },
      innerJoin() {
        return chain;
      },
      leftJoin() {
        return chain;
      },
      orderBy() {
        return chain;
      },
      groupBy() {
        return chain;
      },
      async limit(count) {
        return rows().slice(0, count);
      },
      then(onFulfilled, onRejected) {
        return Promise.resolve(rows()).then(onFulfilled, onRejected);
      },
    };
    return chain;
  };

  const record = (
    bucket: Record<string, unknown[]>,
    table: unknown,
    values: unknown,
  ) => {
    const name = tableNames.get(table) ?? String(table);
    bucket[name] = bucket[name] ?? [];
    bucket[name]!.push(values);
  };

  return {
    select: () => build(),
    insert(table: unknown) {
      return {
        values: async (values: unknown) => {
          record(writes.inserted, table, values);
        },
      };
    },
    update(table: unknown) {
      const chain = {
        set: (values: unknown) => {
          record(writes.updated, table, values);
          return chain;
        },
        where: () => Promise.resolve(),
      };
      return chain;
    },
    delete(table: unknown) {
      return {
        where: async () => {
          writes.deleted.push(tableNames.get(table) ?? String(table));
        },
      };
    },
  };
}
