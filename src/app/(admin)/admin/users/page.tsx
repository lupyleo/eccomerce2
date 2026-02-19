'use client';

import { useEffect, useState } from 'react';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  phone: string | null;
  createdAt: string;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');

  const fetchUsers = (p: number, r: string, q: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: '20' });
    if (r) params.set('role', r);
    if (q) params.set('search', q);
    fetch(`/api/admin/users?${params}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setUsers(json.data);
          setMeta(json.meta);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers(page, role, search);
  }, [page, role]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers(1, role, search);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });
    const json = await res.json();
    if (json.success) fetchUsers(page, role, search);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">회원 관리</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름 또는 이메일 검색..."
            className="flex-1 px-3 py-2 border rounded-lg text-sm"
          />
          <button type="submit" className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm">
            검색
          </button>
        </form>
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">전체 역할</option>
          <option value="USER">일반 회원</option>
          <option value="ADMIN">관리자</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">로딩 중...</div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-5 py-3 text-left">이름</th>
                  <th className="px-5 py-3 text-left">이메일</th>
                  <th className="px-5 py-3 text-left">전화번호</th>
                  <th className="px-5 py-3 text-center">역할</th>
                  <th className="px-5 py-3 text-left">가입일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium">{user.name ?? '-'}</td>
                    <td className="px-5 py-3 text-gray-500">{user.email}</td>
                    <td className="px-5 py-3 text-gray-500">{user.phone ?? '-'}</td>
                    <td className="px-5 py-3 text-center">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="px-2 py-1 border rounded text-xs"
                      >
                        <option value="USER">일반 회원</option>
                        <option value="ADMIN">관리자</option>
                      </select>
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-1 rounded text-sm ${p === page ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-50'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
