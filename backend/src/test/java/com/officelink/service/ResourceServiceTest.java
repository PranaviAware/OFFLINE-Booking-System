package com.officelink.service;

import com.officelink.dto.ResourceRequest;
import com.officelink.dto.ResourceResponse;
import com.officelink.entity.Resource;
import com.officelink.entity.ResourceType;
import com.officelink.exception.BadRequestException;
import com.officelink.exception.ResourceNotFoundException;
import com.officelink.repository.BookingRepository;
import com.officelink.repository.ResourceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ResourceServiceTest {

    @Mock
    private ResourceRepository resourceRepository;

    @Mock
    private BookingRepository bookingRepository;

    @InjectMocks
    private ResourceService resourceService;

    private Resource resource1;
    private Resource resource2;

    @BeforeEach
    void setUp() {
        resource1 = new Resource("res_1", "Boardroom A", ResourceType.MEETING_ROOM, 20, "Floor 5", "Main board room");
        resource2 = new Resource("res_2", "Hot Desk 101", ResourceType.DESK, 1, "Floor 1", "Window seat");
    }

    @Test
    @DisplayName("getAll uses bulk query to determine availability efficiently without N+1 queries")
    void getAll_UsesBulkAvailabilityQuery() {
        when(resourceRepository.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of(resource1, resource2));
        // resource1 is currently booked, resource2 is free
        when(bookingRepository.findCurrentlyBookedResourceIds(any(Instant.class)))
                .thenReturn(Set.of("res_1"));

        List<ResourceResponse> results = resourceService.getAll(null, null, false);

        assertThat(results).hasSize(2);
        assertThat(results.get(0).getId()).isEqualTo("res_1");
        assertThat(results.get(0).getIsCurrentlyAvailable()).isFalse();

        assertThat(results.get(1).getId()).isEqualTo("res_2");
        assertThat(results.get(1).getIsCurrentlyAvailable()).isTrue();

        verify(bookingRepository, times(1)).findCurrentlyBookedResourceIds(any(Instant.class));
        verify(bookingRepository, never()).isResourceCurrentlyBooked(any(), any());
    }

    @Test
    @DisplayName("getById returns resource details with availability")
    void getById_Success() {
        when(resourceRepository.findById("res_1")).thenReturn(Optional.of(resource1));
        when(bookingRepository.isResourceCurrentlyBooked(eq("res_1"), any(Instant.class))).thenReturn(false);

        ResourceResponse res = resourceService.getById("res_1");

        assertThat(res).isNotNull();
        assertThat(res.getName()).isEqualTo("Boardroom A");
        assertThat(res.getIsCurrentlyAvailable()).isTrue();
    }

    @Test
    @DisplayName("getById throws ResourceNotFoundException when id does not exist")
    void getById_NotFound() {
        when(resourceRepository.findById("non_existent")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> resourceService.getById("non_existent"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Resource not found with id: non_existent");
    }

    @Test
    @DisplayName("create validates required fields and persists resource")
    void create_ValidatesAndSaves() {
        ResourceRequest request = new ResourceRequest("Silent Pod 1", ResourceType.DESK, 1, "Floor 3", "Quiet nook", 1);

        when(resourceRepository.save(any(Resource.class))).thenAnswer(i -> i.getArgument(0));

        ResourceResponse response = resourceService.create(request);

        assertThat(response).isNotNull();
        assertThat(response.getName()).isEqualTo("Silent Pod 1");
        assertThat(response.getType()).isEqualTo(ResourceType.DESK);
        assertThat(response.getLocation()).isEqualTo("Floor 3");
        verify(resourceRepository, times(1)).save(any(Resource.class));
    }

    @Test
    @DisplayName("create rejects invalid short name")
    void create_FailsOnShortName() {
        ResourceRequest request = new ResourceRequest(" ", ResourceType.DESK, 1, "Floor 3", "Desc", 1);

        assertThatThrownBy(() -> resourceService.create(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Resource name must be at least 2 characters");
    }

    @Test
    @DisplayName("deactivate sets isActive to false")
    void deactivate_SetsIsActiveFalse() {
        when(resourceRepository.findById("res_1")).thenReturn(Optional.of(resource1));
        when(resourceRepository.save(any(Resource.class))).thenAnswer(i -> i.getArgument(0));

        resourceService.deactivate("res_1");

        assertThat(resource1.getIsActive()).isFalse();
        verify(resourceRepository, times(1)).save(resource1);
    }
}
