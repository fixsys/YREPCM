const report = { project: { work_items_config: {"土木":[{"name":"整地","unit":"式","contractQuantity":50}]} } };
let workItems = [{name:'整地'}];
const config = typeof report.project.work_items_config === 'string' ? JSON.parse(report.project.work_items_config) : report.project.work_items_config;
const allConfigItems = [];
Object.values(config).forEach(arr => { if (Array.isArray(arr)) allConfigItems.push(...arr); });
workItems.forEach(wi => {
    const cfg = allConfigItems.find(c => c.name === wi.name);
    if (cfg) {
        wi.contractQuantity = cfg.contractQuantity;
        wi.unit = cfg.unit;
    }
});
console.log(workItems);
