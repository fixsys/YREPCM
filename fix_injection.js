const fs = require('fs');

let tsCode = fs.readFileSync('backend/src/routes/laborReports.ts', 'utf8');

// The duplicate string
const doubleInjection = `    let workItems = [];
    try { workItems = typeof report.work_items === 'string' ? JSON.parse(report.work_items) : (report.work_items || []); } catch(e){}
    
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
    }`;

const singleInjection = `    let workItems = [];
    try { workItems = typeof report.work_items === 'string' ? JSON.parse(report.work_items) : (report.work_items || []); } catch(e){}
    
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
    }`;

tsCode = tsCode.replace(doubleInjection, singleInjection);

// Now for the PDF block
const pdfBlockTarget = `    let workItems = [];
    try { workItems = typeof report.work_items === 'string' ? JSON.parse(report.work_items) : (report.work_items || []); } catch(e){}
    let workers = [];`;

const pdfBlockReplacement = singleInjection + `\n    let workers = [];`;

tsCode = tsCode.replace(pdfBlockTarget, pdfBlockReplacement);

fs.writeFileSync('backend/src/routes/laborReports.ts', tsCode, 'utf8');
