const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:117468@localhost:5432/hostel-management-db'
  });
  await client.connect();

  try {
    const resTenant = await client.query('SELECT id FROM tenants ORDER BY id DESC LIMIT 1');
    if (resTenant.rows.length === 0) {
      console.log('No tenant found');
      return;
    }
    const tenantId = resTenant.rows[0].id;

    let propertyId;
    const resProp = await client.query('SELECT id FROM properties WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    if (resProp.rows.length > 0) {
      propertyId = resProp.rows[0].id;
    } else {
      const propInsert = await client.query(`
        INSERT INTO properties (tenant_id, name, type, province, district, ward, address_detail, status, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) 
        RETURNING id
      `, [tenantId, 'Khu trọ Test SQL', 'MINI_APARTMENT', 'Hà Nội', 'Cầu Giấy', 'Dịch Vọng', '123 Test SQL', 'ACTIVE']);
      propertyId = propInsert.rows[0].id;
    }

    const roomInsert = await client.query(`
      INSERT INTO rooms (tenant_id, property_id, room_code, title, base_price, deposit_amount, electricity_price, water_price, area, max_occupants, status, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()) 
      RETURNING id
    `, [tenantId, propertyId, 'TEST10K', 'Phòng Test 10k', 10000, 0, 3500, 20000, 20, 2, 'AVAILABLE']);
    
    console.log('CREATED_ROOM_ID=' + roomInsert.rows[0].id);

    // Tạo thêm phòng test thứ 2
    const roomInsert2 = await client.query(`
      INSERT INTO rooms (tenant_id, property_id, room_code, title, base_price, deposit_amount, electricity_price, water_price, area, max_occupants, status, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()) 
      RETURNING id
    `, [tenantId, propertyId, 'TEST20K', 'Phòng Test 20k', 20000, 0, 3500, 20000, 25, 3, 'AVAILABLE']);
    
    console.log('CREATED_ROOM_2_ID=' + roomInsert2.rows[0].id);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
