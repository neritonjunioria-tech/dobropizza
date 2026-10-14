import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Check, UserPlus, Trash2, Key, UserCheck, Lock } from 'lucide-react';

export const PERMISSION_DEFINITIONS = [
  { key: 'ver_pedidos', label: 'Ver e Atualizar Pedidos', description: 'Acesso à aba de Pedidos e alteração de status' },
  { key: 'gerenciar_caixa', label: 'Gerenciar Caixa', description: 'Abertura, fecho e sangrias de caixa' },
  { key: 'gerenciar_produtos', label: 'Gerenciar Produtos', description: 'Adicionar, editar e pausar produtos do cardápio' },
  { key: 'gerenciar_categorias', label: 'Gerenciar Categorias', description: 'Criar e reorganizar categorias' },
  { key: 'ver_relatorios', label: 'Ver Relatórios', description: 'Acesso à aba Visão Geral e Relatórios de Vendas' },
  { key: 'ver_clientes', label: 'Ver Clientes', description: 'Acesso à lista de clientes e histórico' },
  { key: 'gerenciar_configuracoes', label: 'Gerenciar Configurações', description: 'Horários de funcionamento, impressão e lojas' },
  { key: 'gerenciar_usuarios', label: 'Gerenciar Usuários & Permissões', description: 'Criar e definir permissões de funcionários' },
];

export default function UsersManager() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  // New user form
  const [newUsername, setNewUsername] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("staff");
  const [newPermissions, setNewPermissions] = useState<Record<string, boolean>>({});
  const [creatingUser, setCreatingUser] = useState(false);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      setProfiles(data || []);
    } catch (err: any) {
      console.error("Erro ao carregar usuários:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    setFeedback("Criando usuário...");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yexlnjznkxthffklovql.supabase.co';
      const response = await fetch(
        `${baseUrl}/functions/v1/manage-staff`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: 'create',
            username: newUsername,
            password: newPassword,
            role: newRole,
            full_name: newFullName,
            permissions: newPermissions,
          }),
        }
      );
      const result = await response.json();
      if (!response.ok || result.error) {
        const errorMsg = typeof result.error === 'string'
          ? result.error
          : (result.error?.message || result.message || JSON.stringify(result.error || result));
        setFeedback("Erro: " + errorMsg);
      } else {
        setFeedback("Usuário criado com sucesso!");
        setNewUsername("");
        setNewFullName("");
        setNewPassword("");
        setNewRole("staff");
        setNewPermissions({});
        fetchProfiles();
      }
    } catch (err: any) {
      setFeedback("Erro: " + err.message);
    } finally {
      setCreatingUser(false);
      setTimeout(() => setFeedback(""), 4000);
    }
  };

  const handleDeleteUser = async (profileId: string, name: string) => {
    if (!window.confirm(`Remover o acesso de "${name || profileId}"? Essa ação apaga o login e não pode ser desfeita.`)) return;
    try {
      // 1. Remove diretamente da tabela profiles via client Supabase
      const { error: dbError } = await supabase.from('profiles').delete().eq('id', profileId);
      if (dbError) {
        console.warn("Erro ao deletar profile no banco:", dbError);
      }

      // 2. Tenta remover via Edge Function de Auth se disponível
      const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yexlnjznkxthffklovql.supabase.co';
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (token) {
          await fetch(
            `${baseUrl}/functions/v1/manage-staff`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ action: 'delete', userId: profileId }),
            }
          );
        }
      } catch (e) {
        console.warn("Edge function delete call warning:", e);
      }

      setProfiles(prev => prev.filter(p => p.id !== profileId));
      fetchProfiles();
    } catch (err: any) {
      alert("Erro ao remover usuário: " + err.message);
    }
  };

  const handleTogglePermission = async (profileId: string, permKey: string, currentValue: boolean) => {
    setSavingId(profileId);
    try {
      const targetProfile = profiles.find(p => p.id === profileId);
      const currentPermissions = targetProfile?.permissions || {};
      const updatedPermissions = {
        ...currentPermissions,
        [permKey]: !currentValue
      };

      const { error } = await supabase
        .from('profiles')
        .update({ permissions: updatedPermissions })
        .eq('id', profileId);

      if (error) throw error;

      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, permissions: updatedPermissions } : p));
      setFeedback("Permissões atualizadas com sucesso!");
      setTimeout(() => setFeedback(""), 3000);
    } catch (err: any) {
      console.error("Erro ao atualizar permissão:", err);
      alert("Erro ao atualizar permissão: " + err.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleChangeRole = async (profileId: string, newRoleValue: string) => {
    setSavingId(profileId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRoleValue })
        .eq('id', profileId);

      if (error) throw error;

      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, role: newRoleValue } : p));
      setFeedback("Função atualizada com sucesso!");
      setTimeout(() => setFeedback(""), 3000);
    } catch (err: any) {
      alert("Erro ao atualizar função: " + err.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
            <Shield className="text-[#b88a44]" size={22} />
            Gestão de Usuários & Permissões Granulares
          </h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Defina o que cada funcionário pode visualizar e gerenciar no sistema.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-[#E7E5E1] shadow-[0_1px_2px_rgba(28,25,23,0.04),0_1px_8px_rgba(28,25,23,0.04)]">
        <h3 className="text-lg font-bold text-[#1C1917] flex items-center gap-2 mb-1">
          <UserPlus className="text-[#b88a44]" size={20} />
          Criar Novo Acesso
        </h3>
        <p className="text-sm text-[#78716C] mb-5">Crie um usuário e senha para um novo funcionário — sem precisar de e-mail de verdade.</p>
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Nome</label>
              <input type="text" value={newFullName} onChange={e => setNewFullName(e.target.value)} required
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Usuário (sem espaço)</label>
              <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} required
                placeholder="ex: joao"
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Senha</label>
              <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Função</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm mt-1">
                <option value="owner">Dono (Owner - Acesso Total)</option>
                <option value="staff">Funcionário (Staff)</option>
                <option value="caixa">Operador de Caixa</option>
                <option value="cozinha">Cozinha / Produção</option>
                <option value="entregador">Entregador</option>
              </select>
            </div>
          </div>

          {newRole !== 'owner' && (
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase mb-2 block">Permissões</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {PERMISSION_DEFINITIONS.map(perm => (
                  <label key={perm.key} className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${newPermissions[perm.key] ? 'bg-emerald-50/60 border-emerald-300' : 'bg-gray-50/50 border-gray-200'}`}>
                    <input
                      type="checkbox"
                      checked={!!newPermissions[perm.key]}
                      onChange={() => setNewPermissions(prev => ({ ...prev, [perm.key]: !prev[perm.key] }))}
                      className="mt-0.5 w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                    />
                    <div>
                      <div className="font-bold text-xs leading-tight">{perm.label}</div>
                      <div className="text-[11px] text-gray-500 font-normal leading-tight mt-0.5">{perm.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <button type="submit" disabled={creatingUser}
            className="px-6 py-2.5 bg-[#083d07] text-[#fdfbf7] font-bold rounded-lg text-sm hover:bg-[#0b520a] transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm border border-[#d5af7a]/60 cursor-pointer">
            <UserPlus size={18} /> Criar Acesso
          </button>
        </form>
      </div>

      {feedback && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-sm">
          {feedback}
        </div>
      )}

      {/* Profiles List */}
      <div className="bg-white rounded-xl border border-[#E7E5E1] shadow-[0_1px_2px_rgba(28,25,23,0.04),0_1px_8px_rgba(28,25,23,0.04)] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#78716C] font-medium">Carregando usuários...</div>
        ) : profiles.length === 0 ? (
          <div className="p-8 text-center text-[#78716C] font-medium">Nenhum usuário cadastrado.</div>
        ) : (
          <div className="divide-y divide-[#E7E5E1]">
            {profiles.map(profile => {
              const isOwner = profile.role === 'owner';
              const perms = profile.permissions || {};

              return (
                <div key={profile.id} className="p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-[#FAFAF9] p-4 rounded-lg border border-[#E7E5E1]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1C1917] text-base">{profile.full_name || 'Sem nome'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-600">Função:</span>
                      <select
                        value={profile.role || 'staff'}
                        onChange={(e) => handleChangeRole(profile.id, e.target.value)}
                        disabled={savingId === profile.id}
                        className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 outline-none cursor-pointer"
                      >
                        <option value="owner">Dono (Owner - Acesso Total)</option>
                        <option value="staff">Funcionário (Staff)</option>
                        <option value="caixa">Operador de Caixa</option>
                        <option value="cozinha">Cozinha / Produção</option>
                        <option value="entregador">Entregador</option>
                      </select>
                      <button
                        onClick={() => handleDeleteUser(profile.id, profile.full_name)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remover acesso"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Permissões Checklist Grid */}
                  <div>
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">
                      Permissões de Acesso {isOwner && '(Possui acesso total automático)'}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {PERMISSION_DEFINITIONS.map(perm => {
                        const hasPerm = isOwner || !!perms[perm.key];

                        return (
                          <label
                            key={perm.key}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${hasPerm ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950' : 'bg-gray-50/50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                          >
                            <input
                              type="checkbox"
                              checked={hasPerm}
                              disabled={isOwner || savingId === profile.id}
                              onChange={() => handleTogglePermission(profile.id, perm.key, !!perms[perm.key])}
                              className="mt-0.5 w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                            />
                            <div>
                              <div className="font-bold text-xs leading-tight">{perm.label}</div>
                              <div className="text-[11px] text-gray-500 font-normal leading-tight mt-0.5">{perm.description}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
