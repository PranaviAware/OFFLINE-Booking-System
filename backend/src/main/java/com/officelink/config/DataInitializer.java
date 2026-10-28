package com.officelink.config;

import com.officelink.entity.*;
import com.officelink.repository.BookingRepository;
import com.officelink.repository.ResourceRepository;
import com.officelink.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;

/**
 * Seeds static reference data (resources only) on first startup.
 *
 * USER SEEDING IS INTENTIONALLY REMOVED.
 * All users are managed by Keycloak. The backend creates local shadow
 * records via JIT provisioning in AuthController when users first log in.
 * Seeding hard-coded user IDs (e.g. "usr_kpit_admin") would conflict with
 * the Keycloak-issued UUIDs (e.g. "c5171f7e-...") used as the primary key.
 *
 * The sample booking is also removed since it requires a user record to exist,
 * and the actual Keycloak user UUIDs are not known at startup time.
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final ResourceRepository resourceRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;

    public DataInitializer(ResourceRepository resourceRepository,
                           UserRepository userRepository,
                           BookingRepository bookingRepository) {
        this.resourceRepository = resourceRepository;
        this.userRepository = userRepository;
        this.bookingRepository = bookingRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        cleanupOrphanedSeedUsers();
        seedResources();
    }

    /**
     * Remove any legacy seed users whose IDs start with "usr_kpit_" —
     * these were created with hardcoded IDs that do not match Keycloak UUIDs.
     * They will be recreated correctly on first login via JIT provisioning.
     */
    private void cleanupOrphanedSeedUsers() {
        List<String> legacyIds = Arrays.asList("usr_kpit_admin", "usr_kpit_bob", "usr_kpit_charlie");
        for (String id : legacyIds) {
            if (userRepository.existsById(id)) {
                // Remove bookings owned by this legacy user first (FK constraint)
                bookingRepository.deleteByUserId(id);
                userRepository.deleteById(id);
                log.info("  🗑 Removed legacy seed user '{}' — will be re-provisioned from Keycloak on first login", id);
            }
        }
    }

    private void seedResources() {
        if (resourceRepository.count() == 0) {
            log.info("🌱 Seeding corporate resources into PostgreSQL...");

            List<Resource> resources = Arrays.asList(
                    new Resource("res_room_alpha", "Meeting Room Alpha", ResourceType.MEETING_ROOM, 12, "Floor 2, East Wing", "Equipped with dual 4K monitors, Cisco Webex, and digital whiteboard."),
                    new Resource("res_room_beta", "Huddle Room Beta", ResourceType.MEETING_ROOM, 6, "Floor 3, Innovation Hub", "Ideal for small team standups and 1-on-1s. Includes Polycom conference speaker."),
                    new Resource("res_room_board", "Executive Boardroom", ResourceType.MEETING_ROOM, 24, "Floor 5, Penthouse Suite", "Premium boardroom with telepresence, catering counter, and panoramic view."),
                    new Resource("res_desk_101", "Hot Desk 101", ResourceType.DESK, 1, "Floor 1, Open Zone A", "Ergonomic Herman Miller chair, USB-C dock with dual 27-inch monitors."),
                    new Resource("res_desk_102", "Hot Desk 102", ResourceType.DESK, 1, "Floor 1, Open Zone A", "Standard workstation with powered USB hub and ethernet port."),
                    new Resource("res_desk_stand_201", "Standing Desk 201", ResourceType.DESK, 1, "Floor 2, Quiet Zone", "Electric motorized sit-to-stand desk with anti-fatigue mat."),
                    new Resource("res_equip_projector", "4K Laser Projector (Portable)", ResourceType.EQUIPMENT, 1, "IT Helpdesk Locker #4", "Epson 4000 lumens portable 4K laser projector with HDMI/Wireless casting."),
                    new Resource("res_equip_vr", "Meta Quest 3 VR Lab Kit", ResourceType.EQUIPMENT, 1, "Engineering R&D Lab", "Development kit for VR spatial UX testing with charging dock.")
            );

            resourceRepository.saveAll(resources);
            log.info("  ✔ 8 resources seeded (Meeting Rooms, Desks, Equipment)");
        }
    }
}
