const fs = require('fs');
const jwt = require('jsonwebtoken');
const path = require('path');

const token = jwt.sign({ id: '5860f4a6-9880-4a5c-80e8-55e29c8ad3da' }, 'super-secret-jwt-key');

async function test() {
  const form = new FormData();
  form.append('project_id', 'ad441944-15f1-47a3-bd77-cc50a7ea972e');
  form.append('report_date', '2026-08-14');
  form.append('weather', '晴');
  form.append('recorder_id', '5860f4a6-9880-4a5c-80e8-55e29c8ad3da');
  form.append('work_category', '土木');
  form.append('drawing_check_result', '符合圖說');
  
  const existingPhotos = { close: [], mid: [], far: [] };
  form.append('existing_photos', JSON.stringify(existingPhotos));

  // Create a fake image
  const fakeImagePath = path.join(__dirname, 'fake.jpg');
  fs.writeFileSync(fakeImagePath, 'fake image content');
  const fileContent = fs.readFileSync(fakeImagePath);
  const blob = new Blob([fileContent], { type: 'image/jpeg' });
  form.append('photo_close_0', blob, 'fake.jpg');
  form.append('photo_mid_0', blob, 'fake.jpg');
  form.append('photo_far_0', blob, 'fake.jpg');

  try {
    const res = await fetch('http://localhost:3001/api/labor-reports', {
      method: 'POST',
      body: form,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const data = await res.json();
    console.log('Success:', data.photos);
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
