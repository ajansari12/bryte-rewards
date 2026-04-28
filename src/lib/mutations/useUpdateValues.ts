import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queries/keys';
import type { DbValue } from '@/lib/queries/values';

interface UpdateValuesInput {
  org_id: string;
  values: Array<{ id?: string; name: string; icon: string; points: number; sort_order: number }>;
}

export function useUpdateValues() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateValuesInput) => {
      // Upsert all values; rows without an id get a new uuid from the DB
      const rows = input.values.map(v => ({
        ...(v.id ? { id: v.id } : {}),
        org_id: input.org_id,
        name: v.name,
        icon: v.icon,
        points: v.points,
        sort_order: v.sort_order,
      }));
      const { error } = await supabase
        .from('values')
        .upsert(rows, { onConflict: 'id' });
      if (error) throw error;
    },
    onMutate: async (input) => {
      const key = qk.orgValues(input.org_id);
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<DbValue[]>(key);
      queryClient.setQueryData<DbValue[]>(key, input.values.map((v, i) => ({
        id: v.id ?? `optimistic-${i}`,
        org_id: input.org_id,
        name: v.name,
        icon: v.icon,
        points: v.points,
        sort_order: v.sort_order,
      })));
      return { prev, key };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(ctx.key, ctx.prev);
    },
    onSettled: (_data, _err, input) => {
      queryClient.invalidateQueries({ queryKey: qk.orgValues(input.org_id) });
    },
  });
}
