'use client';

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Database from '@tauri-apps/plugin-sql';
import { Plus, Search, Eye, EyeOff, Edit, Trash2, Globe, Mail, User, Lock, Filter, SortAsc, SortDesc } from 'lucide-react';

interface PasswordEntry {
  id: string;
  title: string;
  username: string;
  password: string;
  website?: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

interface CreatePasswordEntry {
  title: string;
  username: string;
  password: string;
  website?: string;
  email?: string;
}

interface UpdatePasswordEntry {
  title?: string;
  username?: string;
  password?: string;
  website?: string;
  email?: string;
}

type SortField = 'title' | 'username' | 'created_at' | 'updated_at';
type SortOrder = 'asc' | 'desc';

export default function PasswordManager() {
  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<PasswordEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<PasswordEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState<CreatePasswordEntry>({
    title: '',
    username: '',
    password: '',
    website: '',
    email: '',
  });

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    filterAndSortEntries();
  }, [entries, searchTerm, sortField, sortOrder]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const db = await Database.load('sqlite:pass.db');
      
      await db.execute(`
        CREATE TABLE IF NOT EXISTS password_entries (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          username TEXT NOT NULL,
          password TEXT NOT NULL,
          website TEXT,
          email TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
      
      const result = await db.select<PasswordEntry[]>(
        'SELECT id, title, username, password, website, email, created_at, updated_at FROM password_entries ORDER BY created_at DESC'
      );
      setEntries(result);
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortEntries = () => {
    let filtered = entries.filter(entry =>
      entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.website?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      let aValue: string | Date = '';
      let bValue: string | Date = '';

      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'username':
          aValue = a.username.toLowerCase();
          bValue = b.username.toLowerCase();
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'updated_at':
          aValue = new Date(a.updated_at);
          bValue = new Date(b.updated_at);
          break;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredEntries(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const db = await Database.load('sqlite:pass.db');
      
      if (editingEntry) {
        const now = await invoke<string>('get_current_time');
        await db.execute(
          'UPDATE password_entries SET title = $1, username = $2, password = $3, website = $4, email = $5, updated_at = $6 WHERE id = $7',
          [formData.title, formData.username, formData.password, formData.website || '', formData.email || '', now, editingEntry.id]
        );
      } else {
        const id = await invoke<string>('generate_id');
        const now = await invoke<string>('get_current_time');
        await db.execute(
          'INSERT INTO password_entries (id, title, username, password, website, email, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [id, formData.title, formData.username, formData.password, formData.website || '', formData.email || '', now, now]
        );
      }
      
      resetForm();
      loadEntries();
    } catch (error) {
      console.error('Error saving entry:', error);
    }
  };

  const handleEdit = (entry: PasswordEntry) => {
    setEditingEntry(entry);
    setFormData({
      title: entry.title,
      username: entry.username,
      password: entry.password,
      website: entry.website || '',
      email: entry.email || '',
    });
    setShowForm(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteEntryId(id);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteEntryId) return;
    
    try {
      const db = await Database.load('sqlite:pass.db');
      await db.execute('DELETE FROM password_entries WHERE id = $1', [deleteEntryId]);
      loadEntries();
      setShowDeleteModal(false);
      setDeleteEntryId(null);
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDeleteEntryId(null);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      username: '',
      password: '',
      website: '',
      email: '',
    });
    setEditingEntry(null);
    setShowForm(false);
  };

  const togglePasswordVisibility = (entryId: string) => {
    const newVisible = new Set(visiblePasswords);
    if (newVisible.has(entryId)) {
      newVisible.delete(entryId);
    } else {
      newVisible.add(entryId);
    }
    setVisiblePasswords(newVisible);
  };

  const generatePassword = () => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setFormData({ ...formData, password });
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <Filter className="w-4 h-4 text-gray-400" />;
    return sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Şifre Yöneticisi</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-orange-500 hover:bg-orange-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Yeni Şifre Ekle
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Şifrelerde ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-black"
          />
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-neutral-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4 text-orange-500">
              {editingEntry ? 'Şifre Düzenle' : 'Yeni Şifre Ekle'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Başlık</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Şifre kaydı başlığı"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kullanıcı Adı</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Kullanıcı adınız"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Şifrenizi girin"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 text-black"
                  />
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-3 py-2 bg-orange-500 hover:bg-orange-400 hover:cursor-pointer rounded-md text-sm"
                  >
                    Oluştur
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Web Sitesi</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ornek@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-400 text-white py-2 rounded-md transition-colors hover:cursor-pointer"
                >
                  {editingEntry ? 'Güncelle' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded-md transition-colors hover:cursor-pointer"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-center text-gray-900 mb-2">
              Şifre Kaydını Sil
            </h2>
            <p className="text-center text-gray-600 mb-6">
              Bu şifre kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteCancel}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-md transition-colors cursor-pointer"
              >
                İptal
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors cursor-pointer"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center">
            <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz şifre kaydı yok</h3>
            <p className="text-gray-500">İlk şifre kaydınızı oluşturmak için "Yeni Şifre Ekle" butonuna tıklayın.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center gap-1">
                      Başlık
                      {getSortIcon('title')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('username')}
                  >
                    <div className="flex items-center gap-1">
                      Kullanıcı Adı
                      {getSortIcon('username')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Şifre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Detaylar
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-1">
                      Oluşturma
                      {getSortIcon('created_at')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{entry.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{entry.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-black">
                          {visiblePasswords.has(entry.id) ? entry.password : '••••••••'}
                        </span>
                        <button
                          onClick={() => togglePasswordVisibility(entry.id)}
                          className="text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          {visiblePasswords.has(entry.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {entry.website && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Globe className="w-4 h-4 mr-1" />
                            <a href={entry.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {entry.website.replace(/^https?:\/\//, '')}
                            </a>
                          </div>
                        )}
                        {entry.email && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="w-4 h-4 mr-1" />
                            {entry.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(entry.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="text-blue-600 hover:text-blue-900 cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(entry.id)}
                          className="text-red-600 hover:text-red-900 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
