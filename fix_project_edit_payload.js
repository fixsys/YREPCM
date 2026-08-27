const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/ProjectDetails.tsx', 'utf8');

const target = `const payload = {
        project_code: editProjectData.project_code,
        name: editProjectData.name,
        status: editProjectData.status,
        owner: editProjectData.owner,`;

const replacement = `const payload = {
        project_code: editProjectData.project_code,
        name: editProjectData.name,
        status: editProjectData.status,
        owner: editProjectData.owner,
        capacity: editProjectData.capacity,`;

code = code.replace(target, replacement);
fs.writeFileSync('frontend/src/pages/ProjectDetails.tsx', code, 'utf8');
