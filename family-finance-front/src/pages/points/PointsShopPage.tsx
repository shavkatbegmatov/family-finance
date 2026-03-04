import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  ShoppingBag, Plus, Edit2, Trash2, ShoppingCart, X, Package, History,
} from 'lucide-react';
import clsx from 'clsx';
import { pointShopApi, pointParticipantApi, pointBalanceApi } from '../../api/points.api';
import type {
  PointShopItem, PointShopItemRequest, PointPurchase, PointParticipant, PointBalance,
} from '../../types/points.types';
import { usePermission } from '../../hooks/usePermission';
import { ModalPortal } from '../../components/common/Modal';
import { formatDate } from '../../config/constants';

interface ShopItemFormState {
  name: string;
  description: string;
  price: number;
  icon: string;
  color: string;
  stock: string;
}

const emptyForm: ShopItemFormState = {
  name: '',
  description: '',
  price: 0,
  icon: '',
  color: '',
  stock: '',
};

export function PointsShopPage() {
  const { canViewPoints, canManagePointShop } = usePermission();

  const [items, setItems] = useState<PointShopItem[]>([]);
  const [participants, setParticipants] = useState<PointParticipant[]>([]);
  const [loading, setLoading] = useState(true);

  // Purchase state
  const [purchaseParticipantId, setPurchaseParticipantId] = useState<number | null>(null);
  const [balance, setBalance] = useState<PointBalance | null>(null);
  const [showPurchaseConfirm, setShowPurchaseConfirm] = useState(false);
  const [purchaseItemId, setPurchaseItemId] = useState<number | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  // Manage modal
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PointShopItem | null>(null);
  const [form, setForm] = useState<ShopItemFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // Purchase history
  const [showHistory, setShowHistory] = useState(false);
  const [purchases, setPurchases] = useState<PointPurchase[]>([]);
  const [historyParticipantId, setHistoryParticipantId] = useState<number | null>(null);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = canManagePointShop
        ? await pointShopApi.getAllItems()
        : await pointShopApi.getItems();
      setItems(res.data?.data ?? res.data ?? []);
    } catch {
      toast.error("Mahsulotlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }, [canManagePointShop]);

  const loadParticipants = useCallback(async () => {
    try {
      const res = await pointParticipantApi.getAll();
      const parts: PointParticipant[] = res.data?.data ?? res.data ?? [];
      setParticipants(parts.filter((p) => p.isActive));
      if (parts.length > 0 && !purchaseParticipantId) {
        setPurchaseParticipantId(parts[0].id);
      }
    } catch { /* ignore */ }
  }, []);

  const loadBalance = useCallback(async () => {
    if (!purchaseParticipantId) return;
    try {
      const res = await pointBalanceApi.get(purchaseParticipantId);
      setBalance(res.data?.data ?? res.data ?? null);
    } catch {
      setBalance(null);
    }
  }, [purchaseParticipantId]);

  const loadPurchaseHistory = useCallback(async () => {
    if (!historyParticipantId) return;
    try {
      const res = await pointShopApi.getPurchases(historyParticipantId, 0, 20);
      const data = res.data?.data ?? res.data;
      setPurchases(data?.content ?? (Array.isArray(data) ? data : []));
    } catch { /* ignore */ }
  }, [historyParticipantId]);

  useEffect(() => {
    loadItems();
    loadParticipants();
  }, [loadItems, loadParticipants]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  useEffect(() => {
    if (showHistory && historyParticipantId) {
      loadPurchaseHistory();
    }
  }, [showHistory, historyParticipantId, loadPurchaseHistory]);

  const handlePurchase = async () => {
    if (!purchaseParticipantId || !purchaseItemId) return;
    try {
      setPurchasing(true);
      await pointShopApi.purchase({
        participantId: purchaseParticipantId,
        shopItemId: purchaseItemId,
      });
      toast.success("Xarid amalga oshirildi!");
      setShowPurchaseConfirm(false);
      loadBalance();
      loadItems();
    } catch {
      toast.error("Xaridda xatolik");
    } finally {
      setPurchasing(false);
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setShowItemModal(true);
  };

  const openEditModal = (item: PointShopItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      description: item.description ?? '',
      price: item.price,
      icon: item.icon ?? '',
      color: item.color ?? '',
      stock: item.stock?.toString() ?? '',
    });
    setShowItemModal(true);
  };

  const handleSaveItem = async () => {
    if (!form.name.trim() || form.price <= 0) {
      toast.error("Nomi va narxini kiriting");
      return;
    }
    try {
      setSubmitting(true);
      const req: PointShopItemRequest = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: form.price,
        icon: form.icon.trim() || undefined,
        color: form.color.trim() || undefined,
        stock: form.stock ? Number(form.stock) : undefined,
      };
      if (editingItem) {
        await pointShopApi.updateItem(editingItem.id, req);
        toast.success("Mahsulot yangilandi");
      } else {
        await pointShopApi.createItem(req);
        toast.success("Mahsulot qo'shildi");
      }
      setShowItemModal(false);
      loadItems();
    } catch {
      toast.error("Saqlashda xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm("Mahsulotni o'chirishni tasdiqlaysizmi?")) return;
    try {
      await pointShopApi.deleteItem(id);
      toast.success("Mahsulot o'chirildi");
      loadItems();
    } catch {
      toast.error("O'chirishda xatolik");
    }
  };

  const purchaseItem = items.find((i) => i.id === purchaseItemId);

  if (!canViewPoints) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-base-content/60">Sizda bu sahifani ko'rish huquqi yo'q.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="h-6 w-6" />
            Do'kon
          </h1>
          <p className="text-base-content/60 mt-1">Ball sarflash uchun mahsulotlar</p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-outline btn-sm gap-1"
            onClick={() => {
              setShowHistory(!showHistory);
              if (!historyParticipantId && participants.length > 0) {
                setHistoryParticipantId(participants[0].id);
              }
            }}
          >
            <History className="h-4 w-4" />
            Tarix
          </button>
          {canManagePointShop && (
            <button className="btn btn-primary btn-sm gap-2" onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              Mahsulot qo'shish
            </button>
          )}
        </div>
      </div>

      {/* Participant & Balance */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="form-control w-full max-w-xs">
          <label className="label"><span className="label-text">Ishtirokchi</span></label>
          <select
            className="select select-bordered select-sm"
            value={purchaseParticipantId ?? ''}
            onChange={(e) => setPurchaseParticipantId(Number(e.target.value))}
          >
            <option value="" disabled>Tanlang...</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>{p.displayName}</option>
            ))}
          </select>
        </div>
        {balance && (
          <div className="text-sm">
            Balans: <strong className="text-primary">{balance.currentBalance.toLocaleString()}</strong> ball
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : (
        <>
          {/* Shop Items Grid */}
          {items.length === 0 ? (
            <div className="text-center py-16 text-base-content/50">
              Mahsulotlar topilmadi
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={clsx(
                    'card bg-base-100 shadow border border-base-200',
                    !item.isActive && 'opacity-50'
                  )}
                >
                  <div className="card-body p-4">
                    <div className="flex items-start justify-between">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                        style={{ backgroundColor: item.color ? `${item.color}20` : undefined }}
                      >
                        {item.icon || <Package className="h-6 w-6 text-base-content/40" />}
                      </div>
                      {canManagePointShop && (
                        <div className="flex gap-1">
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => openEditModal(item)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            className="btn btn-ghost btn-xs text-error"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <h3 className="font-semibold mt-2">{item.name}</h3>
                    {item.description && (
                      <p className="text-xs text-base-content/60 line-clamp-2">{item.description}</p>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      <span className="text-lg font-bold text-primary">
                        {item.price.toLocaleString()} ball
                      </span>
                      {item.stock !== null && item.stock !== undefined && (
                        <span className="badge badge-ghost badge-sm">
                          Qoldiq: {item.stock}
                        </span>
                      )}
                    </div>

                    <button
                      className="btn btn-primary btn-sm mt-2 gap-1"
                      disabled={
                        !purchaseParticipantId ||
                        !item.isActive ||
                        (item.stock !== null && item.stock !== undefined && item.stock <= 0)
                      }
                      onClick={() => {
                        setPurchaseItemId(item.id);
                        setShowPurchaseConfirm(true);
                      }}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Sotib olish
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Purchase History Section */}
          {showHistory && (
            <div className="card bg-base-100 shadow border border-base-200">
              <div className="card-body">
                <h2 className="card-title text-base">Xaridlar tarixi</h2>
                <div className="form-control w-full max-w-xs">
                  <select
                    className="select select-bordered select-sm"
                    value={historyParticipantId ?? ''}
                    onChange={(e) => setHistoryParticipantId(Number(e.target.value))}
                  >
                    <option value="" disabled>Tanlang...</option>
                    {participants.map((p) => (
                      <option key={p.id} value={p.id}>{p.displayName}</option>
                    ))}
                  </select>
                </div>
                {purchases.length === 0 ? (
                  <p className="text-center py-4 text-base-content/50">Xaridlar topilmadi</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-xs">
                      <thead>
                        <tr>
                          <th>Mahsulot</th>
                          <th>Ball</th>
                          <th>Sana</th>
                          <th>Holat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchases.map((p) => (
                          <tr key={p.id}>
                            <td>{p.shopItemName}</td>
                            <td className="font-medium">{p.pointsSpent.toLocaleString()}</td>
                            <td>{formatDate(p.purchaseDate)}</td>
                            <td>
                              {p.isDelivered ? (
                                <span className="badge badge-success badge-xs">Topshirilgan</span>
                              ) : (
                                <span className="badge badge-warning badge-xs">Kutilmoqda</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Purchase Confirmation Modal */}
      <ModalPortal isOpen={showPurchaseConfirm} onClose={() => setShowPurchaseConfirm(false)}>
        <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Xaridni tasdiqlash</h3>
          {purchaseItem && (
            <div className="space-y-3">
              <p>
                <strong>{purchaseItem.name}</strong> mahsulotini sotib olmoqchimisiz?
              </p>
              <p className="text-lg font-bold text-primary">
                {purchaseItem.price.toLocaleString()} ball
              </p>
              {balance && (
                <p className="text-sm text-base-content/60">
                  Joriy balans: {balance.currentBalance.toLocaleString()} ball
                </p>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 mt-6">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowPurchaseConfirm(false)}>
              Bekor qilish
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handlePurchase}
              disabled={purchasing}
            >
              {purchasing && <span className="loading loading-spinner loading-xs" />}
              Sotib olish
            </button>
          </div>
        </div>
      </ModalPortal>

      {/* Item Create/Edit Modal */}
      <ModalPortal isOpen={showItemModal} onClose={() => setShowItemModal(false)}>
        <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {editingItem ? "Mahsulotni tahrirlash" : "Yangi mahsulot"}
            </h3>
            <button className="btn btn-ghost btn-sm btn-square" onClick={() => setShowItemModal(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Nomi *</span></label>
              <input
                type="text"
                className="input input-bordered"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Tavsif</span></label>
              <textarea
                className="textarea textarea-bordered"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label"><span className="label-text">Narx (ball) *</span></label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={form.price || ''}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  min={1}
                />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Qoldiq</span></label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  min={0}
                  placeholder="Cheksiz"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label"><span className="label-text">Ikonka</span></label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  placeholder="Emoji"
                />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Rang</span></label>
                <input
                  type="color"
                  className="input input-bordered h-12"
                  value={form.color || '#6366f1'}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowItemModal(false)}>
              Bekor qilish
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSaveItem}
              disabled={submitting}
            >
              {submitting && <span className="loading loading-spinner loading-xs" />}
              {editingItem ? 'Yangilash' : "Qo'shish"}
            </button>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
