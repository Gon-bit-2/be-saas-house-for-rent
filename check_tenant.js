const { Client } = require('pg');

async function checkTenant() {
  const client = new Client({
    connectionString: 'postgresql://postgres:117468@localhost:5432/hostel-management-db'
  });
  await client.connect();

  try {
    // Lấy tenant gần nhất được sử dụng trong script tạo phòng
    const resTenant = await client.query('SELECT * FROM tenants ORDER BY id DESC LIMIT 1');
    if (resTenant.rows.length === 0) {
      console.log('Không tìm thấy tenant (chủ nhà) nào trong database.');
      return;
    }
    const tenant = resTenant.rows[0];
    console.log('--- THÔNG TIN TÀI KHOẢN (TENANT) ĐANG ĐƯỢC GÁN PHÒNG ---');
    console.log('Tenant ID:', tenant.id);
    
    // Nếu bảng tenants có user_id, ta có thể lấy thêm thông tin user
    if (tenant.user_id) {
        console.log('User ID liên kết:', tenant.user_id);
        try {
             const resUser = await client.query('SELECT * FROM users WHERE id = $1', [tenant.user_id]);
             if(resUser.rows.length > 0) {
                 const user = resUser.rows[0];
                 console.log('Email tài khoản:', user.email);
                 console.log('Số điện thoại:', user.phone);
                 console.log('Tên hiển thị:', user.full_name || user.name);
             }
        } catch(err) {
             // Bỏ qua nếu không có bảng users
        }
    } else {
        // In ra các thông tin khác của tenant
        console.log('Tên Tenant:', tenant.name);
        console.log('Email:', tenant.email);
        console.log('Số điện thoại:', tenant.phone);
    }
    console.log('---------------------------------------------------------');

  } catch (err) {
    console.error('Lỗi truy vấn:', err.message);
  } finally {
    await client.end();
  }
}

checkTenant();
