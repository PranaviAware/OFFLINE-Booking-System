package com.officelink.controller;

import com.officelink.dto.ApiResponse;
import com.officelink.dto.DataListResponse;
import com.officelink.dto.ResourceRequest;
import com.officelink.dto.ResourceResponse;
import com.officelink.entity.ResourceType;
import com.officelink.service.ResourceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/resources")
public class ResourceController {

    private final ResourceService resourceService;

    public ResourceController(ResourceService resourceService) {
        this.resourceService = resourceService;
    }

    @GetMapping
    public ResponseEntity<DataListResponse<ResourceResponse>> getAllResources(
            @RequestParam(value = "type", required = false) ResourceType type,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "all", required = false, defaultValue = "false") boolean all) {
        List<ResourceResponse> resources = resourceService.getAll(type, search, all);
        return ResponseEntity.ok(DataListResponse.of(resources));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResourceResponse> getResourceById(@PathVariable("id") String id) {
        return ResponseEntity.ok(resourceService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ResourceResponse>> createResource(@jakarta.validation.Valid @RequestBody ResourceRequest request) {
        ResourceResponse created = resourceService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>("Resource created successfully", created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ResourceResponse>> updateResource(@PathVariable("id") String id,
                                                                        @jakarta.validation.Valid @RequestBody ResourceRequest request) {
        ResourceResponse updated = resourceService.update(id, request);
        return ResponseEntity.ok(new ApiResponse<>("Resource updated successfully", updated));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteResource(@PathVariable("id") String id) {
        resourceService.deactivate(id);
        return ResponseEntity.ok(new ApiResponse<>("Resource deactivated successfully"));
    }
}
