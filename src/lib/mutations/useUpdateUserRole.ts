import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queries/keys';

interface UpdateUserRoleInput {
  user_id: string;
  org_id: string;
  role: 'employee' | 'manager' | 'admin';
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ user_id, role }: UpdateUserRoleInput) => {
      const { error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', user_id);
      if (error) throw error;
    },
    onSuccess: (_, { org_id }) => {
      qc.invalidateQueries({ queryKey: qk.orgUsers(org_id) });
    },
  });
}
