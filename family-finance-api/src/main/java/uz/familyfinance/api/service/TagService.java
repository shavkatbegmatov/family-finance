package uz.familyfinance.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.familyfinance.api.dto.request.TagRequest;
import uz.familyfinance.api.dto.response.TagResponse;
import uz.familyfinance.api.entity.Tag;
import uz.familyfinance.api.exception.BadRequestException;
import uz.familyfinance.api.exception.ResourceNotFoundException;
import uz.familyfinance.api.repository.TagRepository;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TagService {

    private final TagRepository tagRepository;

    @Transactional(readOnly = true)
    public List<TagResponse> getAll() {
        return tagRepository.findAllOrderedByName().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TagResponse> search(String prefix) {
        String normalized = prefix == null ? "" : prefix.trim().toLowerCase(Locale.ROOT);
        if (normalized.isEmpty()) return getAll();
        return tagRepository.findByNamePrefix(normalized).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public TagResponse create(TagRequest request) {
        String normalizedName = normalize(request.getName());
        tagRepository.findByName(normalizedName).ifPresent(t -> {
            throw new BadRequestException("Bunday nomli tag mavjud: " + normalizedName);
        });
        Tag tag = Tag.builder()
                .name(normalizedName)
                .color(request.getColor())
                .build();
        return toResponse(tagRepository.save(tag));
    }

    @Transactional
    public TagResponse update(Long id, TagRequest request) {
        Tag tag = tagRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tag topilmadi: " + id));
        String normalizedName = normalize(request.getName());
        if (!tag.getName().equals(normalizedName)) {
            tagRepository.findByName(normalizedName).ifPresent(existing -> {
                if (!existing.getId().equals(id)) {
                    throw new BadRequestException("Bunday nomli tag allaqachon mavjud");
                }
            });
        }
        tag.setName(normalizedName);
        tag.setColor(request.getColor());
        return toResponse(tagRepository.save(tag));
    }

    @Transactional
    public void delete(Long id) {
        if (!tagRepository.existsById(id)) {
            throw new ResourceNotFoundException("Tag topilmadi: " + id);
        }
        tagRepository.deleteById(id);
    }

    /**
     * Berilgan ID lar bo'yicha tag entity'larni qaytaradi (TransactionService ishlatadi).
     */
    @Transactional(readOnly = true)
    public Set<Tag> findByIds(Set<Long> ids) {
        if (ids == null || ids.isEmpty()) return new HashSet<>();
        Set<Tag> found = new HashSet<>(tagRepository.findAllById(ids));
        Set<Long> foundIds = found.stream().map(Tag::getId).collect(Collectors.toSet());
        for (Long id : ids) {
            if (!foundIds.contains(id)) {
                throw new ResourceNotFoundException("Tag topilmadi: " + id);
            }
        }
        return found;
    }

    private String normalize(String raw) {
        return raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
    }

    private TagResponse toResponse(Tag tag) {
        return TagResponse.builder()
                .id(tag.getId())
                .name(tag.getName())
                .color(tag.getColor())
                .build();
    }
}
