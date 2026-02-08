import { useState, useEffect, useCallback } from 'react';
import {
  Tags,
  Plus,
  Edit2,
  Trash2,
  X,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { categoriesApi } from '../../api/categories.api';
import { CATEGORY_TYPES, CATEGORY_COLORS } from '../../config/constants';
import { ModalPortal } from '../../components/common/Modal';
import { PermissionCode } from '../../hooks/usePermission';
import { PermissionGate } from '../../components/common/PermissionGate';
import { Select } from '../../components/ui/Select';
import type {
  FinanceCategory,
  FinanceCategoryRequest,
  CategoryType,
  ApiResponse,
} from '../../types';

export function CategoriesPage() {
  const [incomeCategories, setIncomeCategories] = useState<FinanceCategory[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<FinanceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FinanceCategory | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<FinanceCategoryRequest>({
    name: '',
    type: 'INCOME',
    parentId: undefined,
    icon: '',
    color: CATEGORY_COLORS[0],
  });

  // ----------------------------------------------------------------
  // Data fetching
  // ----------------------------------------------------------------
  const fetchCategories = useCallback(async () => {
    try {
      const [incomeRes, expenseRes] = await Promise.all([
        categoriesApi.getByType('INCOME'),
        categoriesApi.getByType('EXPENSE'),
      ]);
      const incomeData = (incomeRes.data as ApiResponse<FinanceCategory[]>).data;
      const expenseData = (expenseRes.data as ApiResponse<FinanceCategory[]>).data;
      setIncomeCategories(incomeData);
      setExpenseCategories(expenseData);
    } catch {
      toast.error('Kategoriyalarni yuklashda xato');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // ----------------------------------------------------------------
  // Modal helpers
  // ----------------------------------------------------------------
  const openCreateModal = (type: CategoryType = 'INCOME') => {
    setEditingCategory(null);
    setFormData({
      name: '',
      type,
      parentId: undefined,
      icon: '',
      color: CATEGORY_COLORS[0],
    });
    setShowModal(true);
  };

  const openEditModal = (category: FinanceCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type,
      parentId: category.parentId,
      icon: category.icon || '',
      color: category.color || CATEGORY_COLORS[0],
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      type: 'INCOME',
      parentId: undefined,
      icon: '',
      color: CATEGORY_COLORS[0],
    });
  };

  // ----------------------------------------------------------------
  // CRUD handlers
  // ----------------------------------------------------------------
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Kategoriya nomini kiriting');
      return;
    }

    setSubmitting(true);
    try {
      const payload: FinanceCategoryRequest = {
        ...formData,
        name: formData.name.trim(),
        parentId: formData.parentId || undefined,
        icon: formData.icon || undefined,
        color: formData.color || undefined,
      };

      if (editingCategory) {
        await categoriesApi.update(editingCategory.id, payload);
        toast.success('Kategoriya yangilandi');
      } else {
        await categoriesApi.create(payload);
        toast.success('Kategoriya yaratildi');
      }

      closeModal();
      fetchCategories();
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { message?: string } } };
      if (error.response?.status !== 403) {
        toast.error(error.response?.data?.message || 'Xato yuz berdi');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (category: FinanceCategory) => {
    if (category.isSystem) {
      toast.error("Tizim kategoriyalarini o'chirish mumkin emas");
      return;
    }

    if (!confirm(`"${category.name}" kategoriyasini o'chirishni tasdiqlaysizmi?`)) return;

    try {
      await categoriesApi.delete(category.id);
      toast.success("Kategoriya o'chirildi");
      fetchCategories();
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { message?: string } } };
      if (error.response?.status !== 403) {
        toast.error(error.response?.data?.message || "O'chirishda xato yuz berdi");
      }
    }
  };

  // ----------------------------------------------------------------
  // Build tree: group children under their parent
  // ----------------------------------------------------------------
  const buildTree = (categories: FinanceCategory[]): FinanceCategory[] => {
    const map = new Map<number, FinanceCategory>();
    const roots: FinanceCategory[] = [];

    categories.forEach((cat) => {
      map.set(cat.id, { ...cat, children: [] });
    });

    categories.forEach((cat) => {
      const node = map.get(cat.id)!;
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  // Parent category options for selected type
  const parentOptions = (formData.type === 'INCOME' ? incomeCategories : expenseCategories).filter(
    (c) => !c.parentId && (!editingCategory || c.id !== editingCategory.id),
  );

  // ----------------------------------------------------------------
  // Render a single category item
  // ----------------------------------------------------------------
  const renderCategoryItem = (category: FinanceCategory, isChild = false) => (
    <div
      key={category.id}
      className={clsx(
        'flex items-center justify-between gap-3 rounded-xl px-4 py-3 transition-colors',
        'bg-base-200/50 hover:bg-base-200',
        isChild && 'ml-8',
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Color dot */}
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: category.color || '#6366f1' }}
        />
        {/* Icon */}
        {category.icon && (
          <span className="text-base-content/70 text-sm shrink-0">{category.icon}</span>
        )}
        {/* Name */}
        <span className="font-medium truncate">{category.name}</span>
        {/* System badge */}
        {category.isSystem && (
          <span className="badge badge-primary badge-xs shrink-0">Tizim</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <PermissionGate permission={PermissionCode.CATEGORIES_UPDATE}>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => openEditModal(category)}
            disabled={category.isSystem}
            title="Tahrirlash"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
        </PermissionGate>
        <PermissionGate permission={PermissionCode.CATEGORIES_DELETE}>
          <button
            className="btn btn-ghost btn-xs text-error"
            onClick={() => handleDelete(category)}
            disabled={category.isSystem}
            title="O'chirish"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </PermissionGate>
      </div>
    </div>
  );

  // ----------------------------------------------------------------
  // Render category column
  // ----------------------------------------------------------------
  const renderColumn = (
    title: string,
    type: CategoryType,
    categories: FinanceCategory[],
    Icon: typeof TrendingUp,
    iconColor: string,
  ) => {
    const tree = buildTree(categories);

    return (
      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body p-5">
          {/* Column header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={clsx(
                  'grid h-10 w-10 place-items-center rounded-lg',
                  iconColor,
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="text-xs text-base-content/60">
                  {categories.length} ta kategoriya
                </p>
              </div>
            </div>
            <PermissionGate permission={PermissionCode.CATEGORIES_CREATE}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => openCreateModal(type)}
                title={`Yangi ${type === 'INCOME' ? 'daromad' : 'xarajat'} kategoriyasi`}
              >
                <Plus className="h-4 w-4" />
              </button>
            </PermissionGate>
          </div>

          {/* Category list */}
          <div className="space-y-2">
            {tree.length === 0 ? (
              <div className="text-center py-8 text-base-content/50">
                <Tags className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Kategoriyalar topilmadi</p>
              </div>
            ) : (
              tree.map((parent) => (
                <div key={parent.id}>
                  {renderCategoryItem(parent)}
                  {parent.children && parent.children.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {parent.children.map((child) => renderCategoryItem(child, true))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  // ----------------------------------------------------------------
  // Main render
  // ----------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kategoriyalar</h1>
          <p className="text-sm text-base-content/60">
            Daromad va xarajat kategoriyalarini boshqarish
          </p>
        </div>
        <PermissionGate permission={PermissionCode.CATEGORIES_CREATE}>
          <button className="btn btn-primary" onClick={() => openCreateModal()}>
            <Plus className="h-5 w-5" />
            Yangi kategoriya
          </button>
        </PermissionGate>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {renderColumn(
            'Daromad kategoriyalari',
            'INCOME',
            incomeCategories,
            TrendingUp,
            'bg-success/15 text-success',
          )}
          {renderColumn(
            'Xarajat kategoriyalari',
            'EXPENSE',
            expenseCategories,
            TrendingDown,
            'bg-error/15 text-error',
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* Add / Edit Modal                                             */}
      {/* ============================================================ */}
      <ModalPortal isOpen={showModal} onClose={closeModal}>
        <div className="w-full max-w-lg bg-base-100 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-4 sm:p-6">
            {/* Modal header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">
                  {editingCategory ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}
                </h3>
                <p className="text-sm text-base-content/60">
                  {editingCategory
                    ? "Kategoriya ma'lumotlarini o'zgartirish"
                    : 'Yangi kategoriya yaratish'}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={closeModal}>
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <div className="mt-6 space-y-4">
              {/* Name */}
              <label className="form-control">
                <span className="label-text">Kategoriya nomi *</span>
                <input
                  type="text"
                  className="input input-bordered"
                  placeholder="Masalan: Maosh"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </label>

              {/* Type select */}
              <Select
                label="Turi"
                required
                value={formData.type}
                onChange={(val) =>
                  setFormData({
                    ...formData,
                    type: val as CategoryType,
                    parentId: undefined,
                  })
                }
                options={Object.values(CATEGORY_TYPES).map((ct) => ({
                  value: ct.value,
                  label: ct.label,
                }))}
                disabled={!!editingCategory}
              />

              {/* Parent category select */}
              <Select
                label="Ota kategoriya"
                value={formData.parentId ?? ''}
                onChange={(val) =>
                  setFormData({
                    ...formData,
                    parentId: val ? Number(val) : undefined,
                  })
                }
                placeholder="Asosiy kategoriya"
                options={parentOptions.map((cat) => ({
                  value: cat.id,
                  label: cat.name,
                }))}
              />

              {/* Icon input */}
              <label className="form-control">
                <span className="label-text">Ikonka (emoji yoki nom)</span>
                <input
                  type="text"
                  className="input input-bordered"
                  placeholder="Masalan: money, food..."
                  value={formData.icon || ''}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                />
              </label>

              {/* Color picker */}
              <div className="form-control">
                <span className="label-text mb-2">Rang</span>
                <div className="grid grid-cols-8 gap-2">
                  {CATEGORY_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={clsx(
                        'h-8 w-8 rounded-full border-2 transition-transform hover:scale-110',
                        formData.color === color
                          ? 'border-base-content scale-110 ring-2 ring-base-content/20'
                          : 'border-transparent',
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={closeModal}>
                Bekor qilish
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={!formData.name.trim() || submitting}
              >
                {submitting && <span className="loading loading-spinner loading-sm" />}
                {editingCategory ? 'Saqlash' : 'Yaratish'}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
