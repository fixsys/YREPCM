const fs = require('fs');

let tsCode = fs.readFileSync('backend/src/routes/laborReports.ts', 'utf8');

// Normalize line endings to \n for easier regex
tsCode = tsCode.replace(/\\r\\n/g, '\\n');

// 1. Remove all instances of the injected logic completely.
const injectionRegex = /\\n\\s*\\/\\/ Inject contract quantity and unit if project has work_items_config\\n(?:.*\\n){21}\\s*\\}\\s*catch \\(e\\) \\{\\}\\n\\s*\\}/g;
tsCode = tsCode.replace(injectionRegex, '');

// 2. Now properly inject the logic right after EVERY `try { workItems = ... } catch(e){}`
const targetLine = `try { workItems = typeof report.work_items === 'string' ? JSON.parse(report.work_items) : (report.work_items || []); } catch(e){}`;

const logicToInject = `
    // Inject contract quantity and unit if project has work_items_config
    if (report.project && report.project.work_items_config) {
      try {
        const config = typeof report.project.work_items_config === 'string' 
          ? JSON.parse(report.project.work_items_config) 
          : report.project.work_items_config;
        
        const allConfigItems: any[] = [];
        Object.values(config).forEach((arr) => {
          if (Array.isArray(arr)) {
            allConfigItems.push(...arr);
          }
        });
        
        workItems.forEach((wi: any) => {
          const cfg = allConfigItems.find(c => c.name === wi.name);
          if (cfg) {
            wi.contractQuantity = cfg.contractQuantity;
            wi.unit = cfg.unit;
          }
        });
      } catch (e) {}
    }
`;

// Replace all occurrences of targetLine with targetLine + logicToInject
tsCode = tsCode.split(targetLine).join(targetLine + logicToInject);

// Write back with CRLF for Windows
tsCode = tsCode.replace(/\\n/g, '\\r\\n');

fs.writeFileSync('backend/src/routes/laborReports.ts', tsCode, 'utf8');
