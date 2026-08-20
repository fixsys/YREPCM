const fs = require('fs');

let code = fs.readFileSync('backend/src/routes/toolboxMeetings.ts', 'utf8');

// Update POST route
const postOld = `const { project_id, record_date, recorder_id, worker_count, work_category, work_content, safety_check_1, safety_check_2, safety_check_3 } = req.body;`;
const postNew = `const { project_id, record_date, recorder_id, worker_count, work_category, work_content, safety_check_1, safety_check_2, safety_check_3, work_area, work_items, hazards, safety_measures, other_risks } = req.body;`;
code = code.replace(postOld, postNew);

const postCreateOld = `      data: {
        project_id,
        record_date: new Date(record_date),
        recorder_id,
        worker_count: parseInt(worker_count, 10),
        work_category,
        work_content,
        safety_check_1: safety_check_1 === 'true',
        safety_check_2: safety_check_2 === 'true',
        safety_check_3: safety_check_3 === 'true',
        photos: photoPaths
      }`;
const postCreateNew = `      data: {
        project_id,
        record_date: new Date(record_date),
        recorder_id,
        worker_count: parseInt(worker_count, 10),
        work_category,
        work_content,
        safety_check_1: safety_check_1 === 'true',
        safety_check_2: safety_check_2 === 'true',
        safety_check_3: safety_check_3 === 'true',
        work_area,
        work_items: work_items ? JSON.parse(work_items) : null,
        hazards: hazards ? JSON.parse(hazards) : null,
        safety_measures: safety_measures ? JSON.parse(safety_measures) : null,
        other_risks,
        photos: photoPaths
      }`;
code = code.replace(postCreateOld, postCreateNew);

// Update PUT route
const putOld = `const { project_id, record_date, worker_count, work_category, work_content, safety_check_1, safety_check_2, safety_check_3 } = req.body;`;
const putNew = `const { project_id, record_date, worker_count, work_category, work_content, safety_check_1, safety_check_2, safety_check_3, work_area, work_items, hazards, safety_measures, other_risks } = req.body;`;
code = code.replace(putOld, putNew);

const putUpdateOld = `      data: {
        project_id,
        record_date: new Date(record_date),
        worker_count: parseInt(worker_count, 10),
        work_category,
        work_content,
        safety_check_1: safety_check_1 === 'true',
        safety_check_2: safety_check_2 === 'true',
        safety_check_3: safety_check_3 === 'true',
        ...(photoPaths.length > 0 && { photos: photoPaths })
      }`;
const putUpdateNew = `      data: {
        project_id,
        record_date: new Date(record_date),
        worker_count: parseInt(worker_count, 10),
        work_category,
        work_content,
        safety_check_1: safety_check_1 === 'true',
        safety_check_2: safety_check_2 === 'true',
        safety_check_3: safety_check_3 === 'true',
        work_area,
        work_items: work_items ? JSON.parse(work_items) : null,
        hazards: hazards ? JSON.parse(hazards) : null,
        safety_measures: safety_measures ? JSON.parse(safety_measures) : null,
        other_risks,
        ...(photoPaths.length > 0 && { photos: photoPaths })
      }`;
code = code.replace(putUpdateOld, putUpdateNew);

fs.writeFileSync('backend/src/routes/toolboxMeetings.ts', code, 'utf8');
