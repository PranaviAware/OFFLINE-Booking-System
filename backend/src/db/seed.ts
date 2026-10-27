import { db } from '../config/database';
import { DEMO_USERS } from '../routes/auth.routes';

export function seedDatabase() {
  console.log('🌱 Seeding Office Link database...');

  // 1. Seed Users
  const insertUser = db.prepare(`
    INSERT INTO users (id, email, full_name, role)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET full_name = excluded.full_name, role = excluded.role
  `);

  Object.values(DEMO_USERS).forEach(u => {
    insertUser.run(u.id, u.email, u.name, u.role);
  });
  console.log('  ✔ Users seeded (Alice Admin, Bob User, Charlie User)');

  // 2. Seed Resources
  const resources = [
    {
      id: 'res_room_alpha',
      name: 'Meeting Room Alpha',
      type: 'MEETING_ROOM',
      capacity: 12,
      location: 'Floor 2, East Wing',
      description: 'Equipped with dual 4K monitors, Cisco Webex, and digital whiteboard.'
    },
    {
      id: 'res_room_beta',
      name: 'Huddle Room Beta',
      type: 'MEETING_ROOM',
      capacity: 6,
      location: 'Floor 3, Innovation Hub',
      description: 'Ideal for small team standups and 1-on-1s. Includes Polycom conference speaker.'
    },
    {
      id: 'res_room_board',
      name: 'Executive Boardroom',
      type: 'MEETING_ROOM',
      capacity: 24,
      location: 'Floor 5, Penthouse Suite',
      description: 'Premium boardroom with telepresence, catering counter, and panoramic view.'
    },
    {
      id: 'res_desk_101',
      name: 'Hot Desk 101',
      type: 'DESK',
      capacity: 1,
      location: 'Floor 1, Open Zone A',
      description: 'Ergonomic Herman Miller chair, USB-C dock with dual 27-inch monitors.'
    },
    {
      id: 'res_desk_102',
      name: 'Hot Desk 102',
      type: 'DESK',
      capacity: 1,
      location: 'Floor 1, Open Zone A',
      description: 'Standard workstation with powered USB hub and ethernet port.'
    },
    {
      id: 'res_desk_stand_201',
      name: 'Standing Desk 201',
      type: 'DESK',
      capacity: 1,
      location: 'Floor 2, Quiet Zone',
      description: 'Electric motorized sit-to-stand desk with anti-fatigue mat.'
    },
    {
      id: 'res_equip_projector',
      name: '4K Laser Projector (Portable)',
      type: 'EQUIPMENT',
      capacity: 1,
      location: 'IT Helpdesk Locker #4',
      description: 'Epson 4000 lumens portable 4K laser projector with HDMI/Wireless casting.'
    },
    {
      id: 'res_equip_vr',
      name: 'Meta Quest 3 VR Lab Kit',
      type: 'EQUIPMENT',
      capacity: 1,
      location: 'Engineering R&D Lab',
      description: 'Development kit for VR spatial UX testing with charging dock.'
    }
  ];

  const insertResource = db.prepare(`
    INSERT INTO resources (id, name, type, capacity, location, description, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT(id) DO UPDATE SET 
      name = excluded.name, 
      type = excluded.type,
      capacity = excluded.capacity,
      location = excluded.location,
      description = excluded.description
  `);

  resources.forEach(r => {
    insertResource.run(r.id, r.name, r.type, r.capacity, r.location, r.description);
  });
  console.log(`  ✔ ${resources.length} Resources seeded (Rooms, Desks, Equipment)`);

  // 3. Seed an existing active booking for demonstration
  // Tomorrow 09:00 to 11:00 UTC on Room Alpha by Alice Admin
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  const bookingId = 'bkg_seed_demo_01';
  const startTime = `${dateStr}T09:00:00.000Z`;
  const endTime = `${dateStr}T11:00:00.000Z`;

  const insertBooking = db.prepare(`
    INSERT INTO bookings (id, resource_id, user_id, start_time, end_time, status, purpose)
    VALUES (?, ?, ?, ?, ?, 'CONFIRMED', ?)
    ON CONFLICT(id) DO NOTHING
  `);

  insertBooking.run(
    bookingId,
    'res_room_alpha',
    'usr_alice_admin',
    startTime,
    endTime,
    'Quarterly Strategy Alignment'
  );
  console.log(`  ✔ Sample booking created for Room Alpha (${startTime} to ${endTime})`);

  console.log('🎉 Seeding completed successfully!\n');
}

if (require.main === module) {
  seedDatabase();
}
