async function runTests() {
  const API_URL = 'http://localhost:3001/api';
  console.log('--- Starting API Tests ---');

  try {
    // 1. Login
    console.log('1. Testing Login...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: 'admin', password: 'admin' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    if (!token) throw new Error('No token received');
    console.log('✅ Login successful, token received.');

    const headers = { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. Test Departments & Roles GET
    console.log('2. Testing Departments & Roles...');
    const deptsRes = await fetch(`${API_URL}/settings/departments`, { headers });
    const depts = await deptsRes.json();
    console.log(`✅ Departments fetched: ${depts.length}`);

    const rolesRes = await fetch(`${API_URL}/settings/roles`, { headers });
    const roles = await rolesRes.json();
    console.log(`✅ Roles fetched: ${roles.length}`);

    // 3. Test Tasks GET
    console.log('3. Testing Tasks GET...');
    const tasksRes = await fetch(`${API_URL}/tasks?task_type=GENERAL`, { headers });
    const tasks = await tasksRes.json();
    console.log(`✅ Tasks fetched: ${tasks.length}`);

    // 4. Test Task Create (General)
    console.log('4. Testing General Task Create...');
    const newTaskRes = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'API Test Task',
        task_type: 'GENERAL',
        status: '未開始'
      })
    });
    const newTask = await newTaskRes.json();
    console.log(`✅ Task created: ${newTask.name}`);

    // 5. Test Settings
    console.log('5. Testing Settings GET...');
    const settingsRes = await fetch(`${API_URL}/settings`, { headers });
    const settings = await settingsRes.json();
    console.log(`✅ Settings fetched: ${settings.length}`);

    console.log('--- All Tests Passed Successfully! ---');

  } catch (error: any) {
    console.error('❌ Test failed!', error.message);
  }
}

runTests();
