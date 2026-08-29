'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  ShieldCheck,
  Crown,
  UserCheck,
  UserX,
  RefreshCw,
  Calendar,
  Mail,
  User as UserIcon,
  Shield,
  Sparkles,
} from 'lucide-react';
import { UserRole } from '@/lib/mongodb/userService';

interface ManagedUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt: number;
}

interface UserManagementViewProps {
  currentUserId?: string;
  currentUserRole?: 'owner' | 'admin' | 'member';
  onShowToast: (message: string, type?: 'success' | 'error') => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  currentUserId,
  currentUserRole = 'member',
  onShowToast,
}) => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(data.users || []);
      } else {
        onShowToast(data.message || 'Gagal memuat data pengguna', 'error');
      }
    } catch (err: any) {
      console.error('Fetch users error:', err);
      onShowToast('Terjadi kesalahan jaringan saat memuat pengguna', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (targetUser: ManagedUser, newRole: 'admin' | 'member') => {
    if (currentUserRole !== 'owner') {
      onShowToast('Hanya Owner yang memiliki izin untuk mengubah Role pengguna', 'error');
      return;
    }

    setUpdatingId(targetUser.id);
    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
        );
        onShowToast(`Berhasil mengubah role @${targetUser.username} menjadi ${newRole.toUpperCase()}`, 'success');
      } else {
        onShowToast(data.message || 'Gagal mengubah role', 'error');
      }
    } catch (err: any) {
      console.error('Update role error:', err);
      onShowToast('Terjadi kesalahan saat mengubah role pengguna', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const totalAdmins = users.filter((u) => u.role === 'admin').length;
  const totalOwners = users.filter((u) => u.role === 'owner').length;
  const totalMembers = users.filter((u) => u.role === 'member').length;

  return (
    <div className="space-y-6">
      {/* ── Top Overview Banner ── */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-[#0b122c] via-[#090e24] to-[#060814] border border-cyan-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold mb-2">
            <Shield size={13} />
            <span>Hak Akses & Otoritas</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Manajemen Pengguna & Role
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Kelola hak akses pengguna. Administrator dapat mengelola konten CMS, dan Owner memiliki kendali penuh termasuk pengelolaan role.
          </p>
        </div>

        {/* Stats Counters */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="px-3.5 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center min-w-[80px]">
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Owner</p>
            <p className="text-base sm:text-lg font-black text-amber-300">{totalOwners}</p>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-center min-w-[80px]">
            <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Admin</p>
            <p className="text-base sm:text-lg font-black text-cyan-300">{totalAdmins}</p>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-center min-w-[80px]">
            <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Member</p>
            <p className="text-base sm:text-lg font-black text-purple-300">{totalMembers}</p>
          </div>
        </div>
      </div>

      {/* ── Search & Refresh Bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan username, email, atau role..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#090e1f] border border-white/10 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
          />
        </div>

        <button
          type="button"
          onClick={fetchUsers}
          disabled={loading}
          className="px-4 py-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 font-bold text-xs border border-white/10 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-cyan-400' : ''} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* ── Users Table ── */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <RefreshCw size={28} className="animate-spin mx-auto mb-3 text-cyan-400" />
          <p className="text-xs font-semibold">Memuat daftar pengguna...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[#090e1f] border border-white/10 text-center">
          <Users size={36} className="mx-auto text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-white mb-1">Pengguna Tidak Ditemukan</h3>
          <p className="text-xs text-slate-400">
            {searchQuery
              ? `Tidak ada pengguna dengan kata kunci "${searchQuery}".`
              : 'Belum ada pengguna yang terdaftar di database.'}
          </p>
        </div>
      ) : (
        <div className="rounded-3xl bg-[#090e1f] border border-white/10 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4 sm:px-6">Pengguna</th>
                  <th className="py-3.5 px-4 sm:px-6">Email</th>
                  <th className="py-3.5 px-4 sm:px-6">Tanggal Daftar</th>
                  <th className="py-3.5 px-4 sm:px-6">Role Saat Ini</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Aksi Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs sm:text-sm">
                {filteredUsers.map((u) => {
                  const isOwnerUser = u.role === 'owner';
                  const isAdminUser = u.role === 'admin';
                  const isCurrent = u.id === currentUserId;
                  const isUpdating = updatingId === u.id;

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-white/[0.02] transition-colors duration-150"
                    >
                      {/* User Info */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl overflow-hidden bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.username} className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-black text-xs text-white">
                                {u.username.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white">{u.username}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white/10 text-cyan-300">
                                  Anda
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono">ID: {u.id.substring(0, 8)}...</span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 sm:px-6 text-slate-300 font-medium">
                        {u.email}
                      </td>

                      {/* Joined Date */}
                      <td className="py-3.5 px-4 sm:px-6 text-slate-400 text-xs">
                        {new Date(u.createdAt).toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      {/* Current Role Badge */}
                      <td className="py-3.5 px-4 sm:px-6">
                        {isOwnerUser ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                            <Crown size={12} className="text-amber-400 fill-amber-400" />
                            <span>OWNER</span>
                          </span>
                        ) : isAdminUser ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-gradient-to-r from-cyan-500/20 to-sky-500/20 border border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
                            <ShieldCheck size={12} className="text-cyan-400" />
                            <span>ADMIN</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-slate-300">
                            <Sparkles size={11} className="text-purple-400" />
                            <span>MEMBER</span>
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        {isOwnerUser ? (
                          <span className="text-xs text-slate-500 font-semibold italic">
                            Owner Utama
                          </span>
                        ) : currentUserRole === 'owner' ? (
                          <div className="flex items-center justify-end gap-2">
                            {isAdminUser ? (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleRoleChange(u, 'member')}
                                className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-bold text-xs border border-purple-500/40 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                              >
                                {isUpdating ? (
                                  <RefreshCw size={12} className="animate-spin" />
                                ) : (
                                  <UserX size={12} />
                                )}
                                <span>Jadikan Member</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleRoleChange(u, 'admin')}
                                className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-xs border border-cyan-500/40 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                              >
                                {isUpdating ? (
                                  <RefreshCw size={12} className="animate-spin" />
                                ) : (
                                  <UserCheck size={12} />
                                )}
                                <span>Jadikan Admin</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">
                            Khusus Owner
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
