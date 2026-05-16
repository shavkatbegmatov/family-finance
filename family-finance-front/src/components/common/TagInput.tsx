import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Tag as TagIcon } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { tagsApi, type TagResponse } from '../../api/tags.api';

interface TagInputProps {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  label?: string;
}

export function TagInput({ selectedIds, onChange, label = 'Teglar' }: TagInputProps) {
  const [allTags, setAllTags] = useState<TagResponse[]>([]);
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadTags = useCallback(async () => {
    try {
      const res = await tagsApi.getAll();
      setAllTags((res.data as { data: TagResponse[] }).data);
    } catch {
      // tag yuklamadi — tinchcha
    }
  }, []);

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  const selectedTags = useMemo(
    () => allTags.filter((t) => selectedIds.includes(t.id)),
    [allTags, selectedIds]
  );

  const filteredSuggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allTags
      .filter((t) => !selectedIds.includes(t.id))
      .filter((t) => !q || t.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [allTags, selectedIds, query]);

  const exactMatch = useMemo(
    () => allTags.find((t) => t.name === query.trim().toLowerCase()),
    [allTags, query]
  );

  const handleAdd = (tag: TagResponse) => {
    onChange([...selectedIds, tag.id]);
    setQuery('');
    inputRef.current?.focus();
  };

  const handleRemove = (id: number) => {
    onChange(selectedIds.filter((selectedId) => selectedId !== id));
  };

  const handleCreate = async () => {
    const name = query.trim().toLowerCase();
    if (!name) return;
    if (exactMatch) {
      handleAdd(exactMatch);
      return;
    }
    setCreating(true);
    try {
      const res = await tagsApi.create({ name });
      const newTag = (res.data as { data: TagResponse }).data;
      setAllTags((prev) => [...prev, newTag]);
      onChange([...selectedIds, newTag.id]);
      setQuery('');
      toast.success('Yangi tag yaratildi');
    } catch {
      toast.error('Tag yaratishda xatolik');
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredSuggestions[0]) {
        handleAdd(filteredSuggestions[0]);
      } else if (query.trim()) {
        void handleCreate();
      }
    } else if (e.key === 'Backspace' && !query && selectedIds.length > 0) {
      handleRemove(selectedIds[selectedIds.length - 1]);
    }
  };

  return (
    <div className="form-control">
      <span className="label-text mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
        {label}
      </span>
      <div className="relative">
        <div className="flex min-h-[3rem] flex-wrap items-center gap-1.5 rounded-xl border border-base-300 bg-base-100 p-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          {selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
              style={tag.color ? { backgroundColor: `${tag.color}20`, color: tag.color } : undefined}
            >
              <TagIcon className="h-3 w-3" />
              {tag.name}
              <button
                type="button"
                className="hover:text-error"
                onClick={() => handleRemove(tag.id)}
                aria-label={`Tag o'chirish: ${tag.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder={selectedIds.length === 0 ? 'Tag qo\'shish...' : ''}
            maxLength={50}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-base-content/40"
          />
        </div>

        {showSuggestions && (filteredSuggestions.length > 0 || query.trim()) && (
          <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-base-300 bg-base-100 shadow-xl">
            {filteredSuggestions.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-base-200"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleAdd(tag)}
              >
                <TagIcon className="h-3.5 w-3.5" />
                {tag.name}
              </button>
            ))}
            {query.trim() && !exactMatch && (
              <button
                type="button"
                className={clsx(
                  'flex w-full items-center gap-2 border-t border-base-200 px-3 py-2 text-left text-sm hover:bg-base-200',
                  creating && 'opacity-50'
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void handleCreate()}
                disabled={creating}
              >
                <Tag />
                <span>
                  Yangi tag yaratish: <strong>{query.trim().toLowerCase()}</strong>
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Local Tag icon for the "create new" suggestion item
function Tag() {
  return <TagIcon className="h-3.5 w-3.5 text-success" />;
}
