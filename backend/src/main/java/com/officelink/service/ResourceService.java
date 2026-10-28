package com.officelink.service;

import com.officelink.dto.ResourceRequest;
import com.officelink.dto.ResourceResponse;
import com.officelink.entity.Resource;
import com.officelink.entity.ResourceType;
import com.officelink.exception.BadRequestException;
import com.officelink.exception.ResourceNotFoundException;
import com.officelink.repository.BookingRepository;
import com.officelink.repository.ResourceRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ResourceService {

    private final ResourceRepository resourceRepository;
    private final BookingRepository bookingRepository;

    public ResourceService(ResourceRepository resourceRepository, BookingRepository bookingRepository) {
        this.resourceRepository = resourceRepository;
        this.bookingRepository = bookingRepository;
    }

    @Transactional(readOnly = true)
    public List<ResourceResponse> getAll(ResourceType type, String search, boolean all) {
        Specification<Resource> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (!all) {
                predicates.add(cb.isTrue(root.get("isActive")));
            }

            if (type != null) {
                predicates.add(cb.equal(root.get("type"), type));
            }

            if (search != null && !search.isBlank()) {
                String term = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), term),
                        cb.like(cb.lower(root.get("location")), term),
                        cb.like(cb.lower(root.get("description")), term)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Sort sort = Sort.by(Sort.Order.asc("type"), Sort.Order.asc("name"));
        List<Resource> resources = resourceRepository.findAll(spec, sort);
        Instant now = Instant.now();
        java.util.Set<String> currentlyBookedIds = bookingRepository.findCurrentlyBookedResourceIds(now);

        return resources.stream().map(r -> {
            boolean isBooked = currentlyBookedIds.contains(r.getId());
            return ResourceResponse.fromEntity(r, !isBooked);
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ResourceResponse getById(String id) {
        Resource resource = resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + id));

        boolean isBooked = bookingRepository.isResourceCurrentlyBooked(id, Instant.now());
        return ResourceResponse.fromEntity(resource, !isBooked);
    }

    @Transactional
    public ResourceResponse create(ResourceRequest request) {
        if (request.getName() == null || request.getName().trim().length() < 2) {
            throw new BadRequestException("Resource name must be at least 2 characters");
        }
        if (request.getType() == null) {
            throw new BadRequestException("Resource type is required (DESK, MEETING_ROOM, EQUIPMENT)");
        }
        if (request.getLocation() == null || request.getLocation().trim().length() < 2) {
            throw new BadRequestException("Resource location is required");
        }

        String id = "res_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        Resource resource = new Resource(
                id,
                request.getName().trim(),
                request.getType(),
                request.getCapacity() != null ? request.getCapacity() : 1,
                request.getLocation().trim(),
                request.getDescription()
        );

        if (request.getIsActive() != null) {
            resource.setIsActive(request.getIsActive() == 1);
        }

        resource = resourceRepository.save(resource);
        return ResourceResponse.fromEntity(resource, true);
    }

    @Transactional
    public ResourceResponse update(String id, ResourceRequest request) {
        Resource existing = resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + id));

        if (request.getName() != null && !request.getName().isBlank()) {
            existing.setName(request.getName().trim());
        }
        if (request.getType() != null) {
            existing.setType(request.getType());
        }
        if (request.getCapacity() != null) {
            existing.setCapacity(request.getCapacity());
        }
        if (request.getLocation() != null && !request.getLocation().isBlank()) {
            existing.setLocation(request.getLocation().trim());
        }
        if (request.getDescription() != null) {
            existing.setDescription(request.getDescription().trim());
        }
        if (request.getIsActive() != null) {
            existing.setIsActive(request.getIsActive() == 1);
        }

        existing = resourceRepository.save(existing);
        boolean isBooked = bookingRepository.isResourceCurrentlyBooked(id, Instant.now());
        return ResourceResponse.fromEntity(existing, !isBooked);
    }

    @Transactional
    public void deactivate(String id) {
        Resource existing = resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + id));

        existing.setIsActive(false);
        resourceRepository.save(existing);
    }
}
