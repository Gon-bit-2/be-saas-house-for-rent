const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:117468@localhost:5432/hostel-management-db'
  });
  await client.connect();

  try {
    const res = await client.query(`
      INSERT INTO renter_profiles (user_id, updated_at)
      SELECT id, NOW() FROM users u
      WHERE NOT EXISTS (
        SELECT 1 FROM renter_profiles r WHERE r.user_id = u.id
      )
    `);
    console.log(`Inserted RenterProfile for ${res.rowCount} users`);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
