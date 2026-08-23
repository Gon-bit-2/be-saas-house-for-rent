const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:117468@localhost:5432/hostel-management-db'
  });
  await client.connect();

  try {
    // Publish room 33
    await client.query(`
      UPDATE rooms 
      SET marketplace_status = 'PUBLISHED' 
      WHERE id = 33
    `);

    // Get the owner's email
    const res = await client.query(`
      SELECT u.email, u.full_name, t.name as tenant_name
      FROM rooms r
      JOIN tenants t ON r.tenant_id = t.id
      JOIN users u ON t.owner_user_id = u.id
      WHERE r.id = 33
    `);
    
    if (res.rows.length > 0) {
      console.log('Room 33 belongs to:');
      console.log('- User Email:', res.rows[0].email);
      console.log('- User Name:', res.rows[0].full_name);
      console.log('- Tenant Name:', res.rows[0].tenant_name);
    } else {
      console.log('Could not find owner for Room 33');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
