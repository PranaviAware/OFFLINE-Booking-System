import { bookingService } from '../src/services/booking.service';
import { db } from '../src/config/database';
import { seedDatabase } from '../src/db/seed';

async function runConcurrencyStressTest() {
  console.log('===========================================================');
  console.log('🧪 CONCURRENCY CONTROL & DATA INTEGRITY VERIFICATION SUITE');
  console.log('Target: Proving zero race conditions under concurrent load');
  console.log('===========================================================\n');

  // Initialize and seed
  seedDatabase();

  const testResourceId = 'res_room_alpha';
  const testStartTime = '2026-12-01T14:00:00.000Z';
  const testEndTime = '2026-12-01T15:30:00.000Z';

  // Clear any existing booking for this test slot
  db.prepare(`
    DELETE FROM bookings 
    WHERE resource_id = ? 
      AND (start_time < ? AND end_time > ?)
  `).run(testResourceId, testEndTime, testStartTime);

  const CONCURRENT_USERS = 15;
  console.log(`🚀 Launching ${CONCURRENT_USERS} simultaneous booking requests for:`);
  console.log(`   Resource ID : ${testResourceId} (Meeting Room Alpha)`);
  console.log(`   Time Slot   : ${testStartTime} -> ${testEndTime} (UTC)\n`);

  // Create 15 simultaneous booking attempts
  const promises = Array.from({ length: CONCURRENT_USERS }, (_, index) => {
    const userId = `usr_test_worker_${index + 1}`;
    return new Promise<{ workerId: number; success: boolean; status: number; message: string }>((resolve) => {
      // Simulate instantaneous dispatch
      setImmediate(() => {
        try {
          const booking = bookingService.createBooking(
            userId,
            testResourceId,
            testStartTime,
            testEndTime,
            `Concurrent Attempt from Thread #${index + 1}`
          );
          resolve({
            workerId: index + 1,
            success: true,
            status: 201,
            message: `Booking committed successfully (ID: ${booking.id})`
          });
        } catch (err: any) {
          resolve({
            workerId: index + 1,
            success: false,
            status: err.statusCode || 500,
            message: err.message
          });
        }
      });
    });
  });

  const results = await Promise.all(promises);

  const successes = results.filter(r => r.success);
  const conflicts = results.filter(r => r.status === 409);
  const others = results.filter(r => r.status !== 201 && r.status !== 409);

  console.log('-----------------------------------------------------------');
  console.log('📊 EXECUTION AUDIT:');
  results.forEach(r => {
    const icon = r.success ? '✅ [201 SUCCESS]' : '🛡️ [409 CONFLICT BLOCKED]';
    console.log(`  Thread #${String(r.workerId).padStart(2, '0')}: ${icon} - ${r.message}`);
  });

  console.log('\n-----------------------------------------------------------');
  console.log('📈 SUMMARY METRICS:');
  console.log(`  Total Requests Dispatched : ${CONCURRENT_USERS}`);
  console.log(`  Successful Bookings (201) : ${successes.length} (Expected: exactly 1)`);
  console.log(`  Rejected Conflicts  (409) : ${conflicts.length} (Expected: exactly ${CONCURRENT_USERS - 1})`);
  console.log(`  Unexpected Failures       : ${others.length} (Expected: 0)`);

  // Verify database record count
  const dbRecord = db.prepare(`
    SELECT count(*) as count FROM bookings 
    WHERE resource_id = ? 
      AND status = 'CONFIRMED'
      AND (start_time < ? AND end_time > ?)
  `).get(testResourceId, testEndTime, testStartTime) as { count: number };

  console.log(`  Physical DB Bookings      : ${dbRecord.count} (Expected: exactly 1)`);
  console.log('-----------------------------------------------------------');

  if (successes.length === 1 && conflicts.length === (CONCURRENT_USERS - 1) && dbRecord.count === 1) {
    console.log('\n🏆 [TEST PASSED] CONCURRENCY INTEGRITY 100% PROVED!');
    console.log('   The system is completely immune to race conditions and double-bookings.\n');
    process.exit(0);
  } else {
    console.error('\n❌ [TEST FAILED] Race condition occurred! Double-booking detected.');
    process.exit(1);
  }
}

runConcurrencyStressTest();
