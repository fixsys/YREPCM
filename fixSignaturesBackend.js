const fs = require('fs');

let schema = fs.readFileSync('backend/prisma/schema.prisma', 'utf8');
schema = schema.replace('other_risks     String?  @db.Text\n  created_at', 'other_risks     String?  @db.Text\n  signatures      Json?\n  created_at');
fs.writeFileSync('backend/prisma/schema.prisma', schema, 'utf8');

let routes = fs.readFileSync('backend/src/routes/toolboxMeetings.ts', 'utf8');
routes = routes.replace(
  'work_area, work_items, hazards, safety_measures, other_risks } = req.body;',
  'work_area, work_items, hazards, safety_measures, other_risks, signatures } = req.body;'
).replace(
  'work_area, work_items, hazards, safety_measures, other_risks } = req.body;', // twice for both POST and PUT
  'work_area, work_items, hazards, safety_measures, other_risks, signatures } = req.body;'
);

routes = routes.replace(
  'other_risks,\n        photos: photoPaths',
  'other_risks,\n        signatures: signatures ? JSON.parse(signatures) : null,\n        photos: photoPaths'
).replace(
  'other_risks,\n        ...(photoPaths.length > 0 && { photos: photoPaths })',
  'other_risks,\n        signatures: signatures ? JSON.parse(signatures) : null,\n        ...(photoPaths.length > 0 && { photos: photoPaths })'
);

fs.writeFileSync('backend/src/routes/toolboxMeetings.ts', routes, 'utf8');
